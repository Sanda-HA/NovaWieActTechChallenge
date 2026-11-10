"""BM25 as plain functions over a dict index."""
import math

import numpy as np


def build_bm25(token_lists, k1=1.5, b=0.75):
    n = len(token_lists)
    df = {}
    tfs = []
    for toks in token_lists:
        tf = {}
        for t in toks:
            tf[t] = tf.get(t, 0) + 1
        tfs.append(tf)
        for t in tf:
            df[t] = df.get(t, 0) + 1
    lens = np.array([len(t) for t in token_lists], dtype=np.float32)
    avgdl = float(lens.mean()) if n else 0.0
    idf = {t: math.log(1.0 + (n - d + 0.5) / (d + 0.5)) for t, d in df.items()}
    return {"tfs": tfs, "lens": lens, "avgdl": avgdl, "idf": idf, "k1": k1, "b": b}


def bm25_scores(index, query_tokens):
    n = len(index["tfs"])
    scores = np.zeros(n, dtype=np.float32)
    if n == 0:
        return scores
    k1, b, avgdl = index["k1"], index["b"], index["avgdl"] or 1.0
    for term in set(query_tokens):
        idf = index["idf"].get(term)
        if idf is None:
            continue
        for i, tf in enumerate(index["tfs"]):
            f = tf.get(term, 0)
            if f:
                denom = f + k1 * (1.0 - b + b * index["lens"][i] / avgdl)
                scores[i] += idf * f * (k1 + 1.0) / denom
    return scores
