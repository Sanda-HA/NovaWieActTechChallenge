"""Central configuration: paths, limits from the EdNova v2 plan, scoring constants.

Everything is a plain module-level constant. Secrets come from environment variables only
and are never printed or logged.
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ---- data locations -------------------------------------------------------
DOCS_DIR = Path(os.getenv("DOCS_DIR", ROOT / "data" / "documents"))
MANIFEST_PATH = ROOT / "data" / "source_manifest.csv"
APPROVED_SOURCES_PATH = ROOT / "data" / "approved_sources.csv"
GLOSSARY_PATH = ROOT / "data" / "glossary_fr_ar.json"
EVAL_PATH = ROOT / "data" / "eval_questions.jsonl"
THRESHOLDS_PATH = ROOT / "data" / "thresholds.json"
_index_dir = Path(os.getenv("INDEX_DIR", "index"))
INDEX_DIR = _index_dir if _index_dir.is_absolute() else ROOT / _index_dir

# ---- limits from the v2 plan (agent loop table) ---------------------------
MAX_CHUNKS_PER_SEARCH = 4      # "Maximum chunks per search: 4"
MAX_TOTAL_CHUNKS = 8           # "Maximum total retrieved chunks: 8" (enforced by the agent via exclude_chunk_ids)
CONTENT_TYPES = ("course", "exercise", "definition")
MAX_QUESTION_CHARS = 1000

# ---- embeddings -----------------------------------------------------------
EMBED_BACKEND = os.getenv("EMBED_BACKEND", "local")      # local | platform
EMBED_DIM_LOCAL = 1024
PLATFORM_BASE_URL = os.getenv("PLATFORM_BASE_URL", "")
PLATFORM_API_KEY = os.getenv("PLATFORM_API_KEY", "")
EMBED_MODEL = os.getenv("EMBED_MODEL", "")
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "16"))
EMBED_MAX_RETRIES = 5
EMBED_RETRY_MAX_DELAY = 30.0

# ---- chunking -------------------------------------------------------------
CHUNK_MAX_CHARS = 900          # exercises (statement + solution) must stay in one chunk

# ---- retrieval ------------------------------------------------------------
CANDIDATES = 20                # per retriever, before fusion
RRF_K = 60
MAX_PER_DOCUMENT = 2           # diversity: at most 2 chunks from one document per call
NEAR_DUPLICATE_COS = 0.97
MIN_RELEVANCE = 0.10           # chunks scoring below this are not returned (saves LLM context / quota)
W_COVERAGE = 0.65              # relevance = W_COVERAGE * lexical coverage + W_DENSE * dense score
W_DENSE = 0.35
HEADING_BONUS = 0.05
# cosine range mapped to [0, 1]; depends on the embedding backend (tune with evaluate.py)
DENSE_RANGE = {"local": (0.05, 0.60), "platform": (0.20, 0.80)}

# ---- evidence hint (rule-based; calibrated by evaluate.py --write-thresholds) ----
DEFAULT_THRESHOLDS = {"sufficient": 0.55, "partial": 0.30}

# ---- API response cache ---------------------------------------------------
CACHE_MAX_ENTRIES = 256
