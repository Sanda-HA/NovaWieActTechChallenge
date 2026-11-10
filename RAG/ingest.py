"""Build the index: read documents, check the source manifest, chunk, embed, save.

Usage:
    python ingest.py                 # uses EMBED_BACKEND from the environment (default: local)
    python ingest.py --strict        # fail if any document lacks a verified usage permission
    python ingest.py --verified-only # omit documents with unverified usage permission
    python ingest.py --backend platform
"""
import argparse
import csv
import sys

import numpy as np

from app import config, embeddings
from app.chunking import chunk_document
from app.store import save_index


def read_manifest(path):
    with open(path, encoding="utf-8", newline="") as f:
        return {row["document_id"]: row for row in csv.DictReader(f)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", default=config.EMBED_BACKEND, choices=["local", "platform"])
    permission = parser.add_mutually_exclusive_group()
    permission.add_argument("--strict", action="store_true", help="fail unless every document has permission_verified=yes")
    permission.add_argument("--verified-only", action="store_true", help="skip documents without verified usage permission")
    args = parser.parse_args()

    manifest = read_manifest(config.MANIFEST_PATH)
    files = sorted(config.DOCS_DIR.glob("*.md"))
    if not files:
        sys.exit("No documents found in %s" % config.DOCS_DIR)

    chunks, problems, documents = [], [], 0
    for path in files:
        row = manifest.get(path.stem)
        if args.verified_only and (row is None or row["permission_verified"].strip().lower() != "yes"):
            continue
        raw = path.read_text(encoding="utf-8")
        if "<!-- REVIEW" in raw:
            msg = "%s: still contains '<!-- REVIEW' markers (draft not reviewed yet)" % path.name
            if args.strict or args.verified_only:
                problems.append(msg)
                continue
            print("WARNING  " + msg)
        try:
            doc_chunks = chunk_document(raw)
        except ValueError as exc:
            problems.append("%s: %s" % (path.name, exc))
            continue
        doc_id = doc_chunks[0]["document_id"] if doc_chunks else path.stem
        if doc_id != path.stem:
            problems.append("%s: document_id '%s' differs from file name" % (path.name, doc_id))
        if row is None:
            problems.append("%s: not listed in source_manifest.csv" % doc_id)
        elif row["permission_verified"].strip().lower() != "yes":
            msg = "%s: usage permission not verified (%s)" % (doc_id, row["license_or_permission"])
            if args.strict:
                problems.append(msg)
            else:
                print("WARNING  " + msg)
        chunks.extend(doc_chunks)
        documents += 1

    ids = [c["chunk_id"] for c in chunks]
    if len(ids) != len(set(ids)):
        problems.append("duplicate chunk_id values")
    if problems:
        sys.exit("Ingestion stopped:\n  " + "\n  ".join(problems))
    if not chunks:
        sys.exit("No eligible chunks to index")

    texts = [c["heading"] + "\n" + c["content"] for c in chunks]
    print("Embedding %d chunks with backend=%s ..." % (len(texts), args.backend))
    vectors = embeddings.embed_texts(texts, backend=args.backend)
    meta = save_index(config.INDEX_DIR, chunks, np.asarray(vectors), args.backend, vectors.shape[1],
                      model=config.EMBED_MODEL if args.backend == "platform" else "hashing-v1")
    by_type = {}
    for c in chunks:
        by_type[c["content_type"]] = by_type.get(c["content_type"], 0) + 1
    by_lang = {}
    for c in chunks:
        by_lang[c["language"]] = by_lang.get(c["language"], 0) + 1
    print("Index saved to %s" % config.INDEX_DIR)
    print("  documents:", documents, "| chunks:", meta["n_chunks"], "| dim:", meta["dim"])
    print("  by content_type:", by_type)
    print("  by language:", by_lang)
    if args.backend == "platform":
        print("  platform embedding calls used:", embeddings.STATS["platform_calls"])


if __name__ == "__main__":
    main()
