"""FastAPI RAG service for ranked retrieval and verified chapter excerpts.

Run:  uvicorn app.main:app --port 8001
No pydantic models: the request body is validated by a plain function.
"""

import logging
import time
from collections import OrderedDict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app import config, embeddings
from app.retrieval import load_thresholds, retrieve
from app.sources import chapter_excerpts, read_approved_sources, read_manifest
from app.store import load_index

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("rag")  # Log counts and timings only, never student text.

app = FastAPI(title="EdNova RAG service", version="1.0")
STATE = {"index": None, "cache": OrderedDict(), "hits": 0, "calls": 0}


def get_index():
    if STATE["index"] is None:
        STATE["index"] = load_index(config.INDEX_DIR)
    return STATE["index"]


def validate_request(body):
    """Return (clean_params, error_message). Plan contract: question, grade, section, subject, language, top_k, content_type."""
    if not isinstance(body, dict):
        return None, "body must be a JSON object"
    question = body.get("question")
    if not isinstance(question, str) or not question.strip():
        return None, "'question' is required (non-empty string)"
    if len(question) > config.MAX_QUESTION_CHARS:
        return (
            None,
            f"'question' is longer than {config.MAX_QUESTION_CHARS} characters",
        )
    clean = {"question": question.strip()}
    for key in ("grade", "section", "subject", "language"):
        value = body.get(key)
        if value is not None and not isinstance(value, str):
            return None, f"'{key}' must be a string"
        clean[key] = value or None
    content_type = body.get("content_type")
    if content_type is not None and content_type not in config.CONTENT_TYPES:
        return None, f"'content_type' must be one of {list(config.CONTENT_TYPES)}"
    clean["content_type"] = content_type
    top_k = body.get("top_k", config.MAX_CHUNKS_PER_SEARCH)
    if not isinstance(top_k, int) or isinstance(top_k, bool) or top_k < 1:
        return None, "'top_k' must be a positive integer"
    clean["top_k"] = min(
        top_k, config.MAX_CHUNKS_PER_SEARCH
    )  # hard cap from the plan's loop limits
    exclude = body.get("exclude_chunk_ids", [])
    if not isinstance(exclude, list) or not all(isinstance(x, str) for x in exclude):
        return None, "'exclude_chunk_ids' must be a list of strings"
    clean["exclude_chunk_ids"] = exclude
    return clean, None


@app.get("/health")
def health():
    meta = get_index()["meta"]
    return {
        "status": "ok",
        "chunks": meta["n_chunks"],
        "backend": meta["backend"],
        "built_at": meta["built_at"],
    }


@app.get("/stats")
def stats():
    calls = STATE["calls"]
    return {
        "retrieve_calls": calls,
        "cache_hits": STATE["hits"],
        "cache_hit_rate": round(STATE["hits"] / calls, 3) if calls else 0.0,
        "platform_embedding_calls": embeddings.STATS["platform_calls"],
    }


@app.get("/chapter-excerpts/{document_id}")
def read_chapter_excerpts(document_id: str, grade: str, section: str, subject: str):
    try:
        approved = read_approved_sources(config.APPROVED_SOURCES_PATH)
        entry = read_manifest(config.MANIFEST_PATH).get(document_id, {})
        chunks = (
            chapter_excerpts(get_index(), document_id, grade, section, subject)
            if document_id in approved and entry.get("permission_verified", "").strip().casefold() == "yes" else []
        )
    except OSError as exc:
        raise HTTPException(503, detail={"error": "corpus_unavailable"}) from exc
    if not chunks:
        raise HTTPException(404, detail={"error": "not_in_course"})
    return {"chunks": chunks}


@app.post("/retrieve")
async def retrieve_endpoint(request: Request):
    started = time.time()
    try:
        body = await request.json()
    except ValueError:
        return JSONResponse({"error": "invalid JSON body"}, status_code=400)
    params, error = validate_request(body)
    if error:
        return JSONResponse({"error": error}, status_code=422)

    STATE["calls"] += 1
    key = repr(
        sorted((k, tuple(v) if isinstance(v, list) else v) for k, v in params.items())
    )
    cache = STATE["cache"]
    if key in cache:
        cache.move_to_end(key)
        STATE["hits"] += 1
        result = dict(cache[key], cached=True)
    else:
        try:
            result = await run_in_threadpool(
                retrieve, get_index(), thresholds=load_thresholds(), **params
            )
        except FileNotFoundError as exc:
            return JSONResponse({"error": str(exc)}, status_code=503)
        except RuntimeError as exc:  # embeddings endpoint unavailable after retries
            return JSONResponse({"error": str(exc)}, status_code=503)
        cache[key] = result
        if len(cache) > config.CACHE_MAX_ENTRIES:
            cache.popitem(last=False)
        result = dict(result, cached=False)
    result["latency_ms"] = round((time.time() - started) * 1000, 1)
    log.info(
        "retrieve ct=%s n=%d hint=%s cached=%s %.0fms",
        params["content_type"],
        len(result["chunks"]),
        result["evidence_hint"],
        result["cached"],
        result["latency_ms"],
    )
    return result
