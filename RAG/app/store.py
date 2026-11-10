"""Index persistence: chunks.jsonl + vectors.npy + meta.json (all plain files).

This is a local stand-in for the platform's vector database (one collection per team).
To move to the platform collection, replace save_index / load_index and the dense scoring
step in retrieval.py; everything else stays the same.
"""
import json
import time

import numpy as np

from app.bm25 import build_bm25
from app.embeddings import tokenize


def save_index(index_dir, chunks, vectors, backend, dim, model=""):
    index_dir.mkdir(parents=True, exist_ok=True)
    with open(index_dir / "chunks.jsonl", "w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    np.save(index_dir / "vectors.npy", vectors.astype(np.float32))
    meta = {"backend": backend, "dim": int(dim), "model": model, "n_chunks": len(chunks),
            "built_at": time.strftime("%Y-%m-%d %H:%M:%S")}
    with open(index_dir / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    return meta


def load_index(index_dir):
    if not (index_dir / "meta.json").exists():
        raise FileNotFoundError("No index found in %s. Run: python ingest.py" % index_dir)
    with open(index_dir / "meta.json", encoding="utf-8") as f:
        meta = json.load(f)
    with open(index_dir / "chunks.jsonl", encoding="utf-8") as f:
        chunks = [json.loads(line) for line in f if line.strip()]
    vectors = np.load(index_dir / "vectors.npy")
    token_lists = [tokenize(c["heading"] + " " + c["content"]) for c in chunks]
    return {
        "meta": meta,
        "chunks": chunks,
        "vectors": vectors,
        "token_sets": [set(t) for t in token_lists],
        "heading_sets": [set(tokenize(c["heading"])) for c in chunks],
        "bm25": build_bm25(token_lists),
    }
