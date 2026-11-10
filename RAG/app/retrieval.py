"""Hybrid retrieval with metadata filters, glossary expansion, reranking and an evidence hint.

Pipeline for one /retrieve call (all plain functions):
  1. metadata filter      grade / section / subject / content_type  (hard filters, plan "chunk metadata")
  2. query analysis       Derja -> FR normalisation, FR/AR/EN glossary expansion
  3. candidate generation BM25 (lexical) + dense cosine, each top CANDIDATES
  4. fusion               Reciprocal Rank Fusion
  5. rerank               coverage (IDF-weighted query-term coverage) + dense similarity + heading bonus
  6. selection            drop weak chunks, exclude ids already seen, per-document cap, near-duplicate removal
  7. evidence hint        sufficient / partial / insufficient (advisory, thresholds calibrated by evaluate.py)
"""
import json

import numpy as np

from app import config
from app.bm25 import bm25_scores
from app.embeddings import embed_query, normalize_text
from app.glossary import analyze_query, get_glossary

MODES = ("hybrid", "rrf", "bm25", "dense")


def load_thresholds():
    path = config.THRESHOLDS_PATH
    if path.exists():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return {"sufficient": float(data["sufficient"]), "partial": float(data["partial"])}
    return dict(config.DEFAULT_THRESHOLDS)


def filter_mask(index, grade=None, section=None, subject=None, content_type=None):
    """Boolean mask of chunks matching every filter that was provided (accent/case-insensitive)."""
    wanted = {"grade": grade, "section": section, "subject": subject, "content_type": content_type}
    wanted = {k: normalize_text(v) for k, v in wanted.items() if v}
    mask = np.ones(len(index["chunks"]), dtype=bool)
    for i, chunk in enumerate(index["chunks"]):
        for key, value in wanted.items():
            if normalize_text(str(chunk[key])) != value:
                mask[i] = False
                break
    return mask


def idf_of(index, token):
    idf = index["bm25"]["idf"]
    if token in idf:
        return idf[token]
    return max(idf.values()) if idf else 1.0       # unseen token: as rare as it gets


def coverage_score(index, analysis, chunk_id):
    """IDF-weighted share of the question's content that the chunk contains (0..1).

    A glossary concept counts as covered if ANY of its FR/AR/EN variants is in the chunk,
    which is what makes retrieval work across languages.
    """
    tokens = index["token_sets"][chunk_id]
    total, got = 0.0, 0.0
    for tok in analysis["leftover"]:
        w = idf_of(index, tok)
        total += w
        got += w if tok in tokens else 0.0
    for concept in analysis["concepts"]:
        mt = concept["matched_tokens"]
        w = 1.5 * sum(idf_of(index, t) for t in mt) / len(mt)
        total += w
        best = 0.0
        for alt in concept["alternatives"]:
            best = max(best, sum(1 for t in alt if t in tokens) / len(alt))
        got += w * best
    return got / total if total > 0 else 0.0


def dense_to_unit(cosine, backend):
    lo, hi = config.DENSE_RANGE[backend]
    return float(min(1.0, max(0.0, (cosine - lo) / (hi - lo))))


def rrf_fuse(rank_lists, k=None):
    k = k or config.RRF_K
    fused = {}
    for ranking in rank_lists:
        for rank, cid in enumerate(ranking, start=1):
            fused[cid] = fused.get(cid, 0.0) + 1.0 / (k + rank)
    return fused


def evidence_hint(chunks, thresholds):
    if not chunks:
        return "insufficient"
    top = chunks[0]["score"]
    if top >= thresholds["sufficient"]:
        return "sufficient"
    if top >= thresholds["partial"]:
        return "partial"
    return "insufficient"


def retrieve(index, question, grade=None, section=None, subject=None, language=None, content_type=None,
             top_k=config.MAX_CHUNKS_PER_SEARCH, exclude_chunk_ids=None, mode="hybrid", use_glossary=True,
             min_relevance=None, max_k=config.MAX_CHUNKS_PER_SEARCH, thresholds=None):
    """Run one retrieval. max_k is the hard per-call cap (4 in the API; evaluate.py raises it to 5 for recall@5)."""
    if mode not in MODES:
        raise ValueError("mode must be one of %s" % (MODES,))
    top_k = max(1, min(int(top_k), max_k))
    min_relevance = config.MIN_RELEVANCE if min_relevance is None else min_relevance
    thresholds = thresholds or load_thresholds()
    exclude = set(exclude_chunk_ids or [])
    backend = index["meta"]["backend"]
    chunks = index["chunks"]

    mask = filter_mask(index, grade, section, subject, content_type)
    n_filtered = int(mask.sum())
    glo = get_glossary()
    analysis = analyze_query(glo, question, expand=use_glossary)
    diagnostics = {
        "normalized_question": analysis["text"],
        "glossary_concepts": [c["id"] for c in analysis["concepts"]],
        "expanded_terms": analysis["extra_terms"],
        "chunks_after_filters": n_filtered,
        "mode": mode,
        "embedding_backend": backend,
    }
    if n_filtered == 0:
        return {"chunks": [], "evidence_hint": "insufficient", "diagnostics": diagnostics}

    # ---- candidate generation
    bm25_query = list(analysis["leftover"])
    for concept in analysis["concepts"]:
        for alt in concept["alternatives"]:
            bm25_query.extend(alt)
    lexical = bm25_scores(index["bm25"], bm25_query)
    query_text = (analysis["text"] + " " + " ".join(analysis["extra_terms"])).strip()
    qvec = embed_query(query_text, backend, index["meta"]["dim"])
    cosines = index["vectors"] @ qvec

    valid = np.where(mask)[0]
    lex_rank = [int(i) for i in valid[np.argsort(-lexical[valid])][:config.CANDIDATES] if lexical[i] > 0]
    dense_rank = [int(i) for i in valid[np.argsort(-cosines[valid])][:config.CANDIDATES]]
    fused = rrf_fuse([lex_rank, dense_rank])

    if mode == "bm25":
        candidates = lex_rank
    elif mode == "dense":
        candidates = dense_rank
    else:
        candidates = sorted(fused, key=lambda i: -fused[i])

    # ---- score every candidate
    heading_query = set(analysis["leftover"]) | {t for c in analysis["concepts"] for a in c["alternatives"] for t in a}
    scored = []
    for cid in candidates:
        cov = coverage_score(index, analysis, cid)
        dn = dense_to_unit(float(cosines[cid]), backend)
        bonus = config.HEADING_BONUS if heading_query & index["heading_sets"][cid] else 0.0
        if language and chunks[cid]["language"] == language:
            bonus += 0.02
        relevance = min(1.0, config.W_COVERAGE * cov + config.W_DENSE * dn + bonus)
        scored.append({"cid": cid, "relevance": relevance, "coverage": cov, "dense": dn, "rrf": fused.get(cid, 0.0),
                       "bm25": float(lexical[cid]), "cosine": float(cosines[cid])})
    if mode == "hybrid":
        scored.sort(key=lambda s: -s["relevance"])      # rerank
    # other modes keep the order of their own ranking

    # ---- selection
    selected, per_doc = [], {}
    for s in scored:
        chunk = chunks[s["cid"]]
        if chunk["chunk_id"] in exclude or s["relevance"] < min_relevance:
            continue
        if per_doc.get(chunk["document_id"], 0) >= config.MAX_PER_DOCUMENT:
            continue
        if any(float(index["vectors"][s["cid"]] @ index["vectors"][o["cid"]]) >= config.NEAR_DUPLICATE_COS for o in selected):
            continue
        selected.append(s)
        per_doc[chunk["document_id"]] = per_doc.get(chunk["document_id"], 0) + 1
        if len(selected) >= top_k:
            break

    out = []
    for rank, s in enumerate(selected, start=1):
        c = chunks[s["cid"]]
        out.append({
            "rank": rank,
            "chunk_id": c["chunk_id"],
            "document_id": c["document_id"],
            "content": c["content"],
            "score": round(s["relevance"], 4),
            "scores": {"coverage": round(s["coverage"], 4), "dense": round(s["dense"], 4),
                       "bm25": round(s["bm25"], 4), "rrf": round(s["rrf"], 5)},
            "metadata": {k: c[k] for k in ("country", "educational_level", "grade", "section", "subject", "topic",
                                           "heading", "content_type", "language", "source", "page")},
        })
    return {"chunks": out, "evidence_hint": evidence_hint(out, thresholds), "diagnostics": diagnostics}
