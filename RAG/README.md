# EdNova RAG service

The RAG half of the EdNova v2 plan (Agentic RAG): it ingests the curriculum corpus and serves **`POST /retrieve`**, the only coupling with the LLM/agent service. Python files only, plain functions, no custom classes.

## What it does

```
documents (*.md) --ingest.py--> chunks + metadata + embeddings  --> index/
                                                                      |
agent tool (search_courses / search_exercises / search_definitions)   |
        |  POST /retrieve {question, grade, section, subject, content_type, ...}
        v                                                             v
  metadata filters -> Derja + glossary expansion -> BM25 + dense -> RRF -> rerank -> selection -> evidence_hint
        |
        v  chunks with chunk_id, metadata, scores  (the LLM never invents citations or pages)
```

| Plan requirement | Where |
|---|---|
| `/retrieve` with question, grade, section, subject, language, top_k, **content_type** | `app/main.py` |
| Three tools = three `content_type` filters (`course`, `exercise`, `definition`) | `app/retrieval.py` `filter_mask` |
| Loop limits: max **4 chunks per search** (agent enforces 8 total, 2 rounds, 4 tool calls) | `config.py`, `exclude_chunk_ids` lets the agent avoid re-fetching chunks it already holds |
| Chunk metadata exactly as in the plan (`chunk_id`, `document_id`, `grade`, `section`, ... `page`) | `app/chunking.py` |
| Hybrid search + metadata filtering + reranking | BM25 + dense + RRF + coverage rerank |
| Bilingual glossary (FR/AR/EN) and Derja normalisation before retrieval | `app/glossary.py`, `data/glossary_fr_ar.json` |
| Source manifest with usage permission | `data/source_manifest.csv`, checked by `ingest.py` |
| Retrieval measured on its own: recall@k, MRR; evidence thresholds calibrated on unanswerable/ambiguous questions | `evaluate.py` |
| Cache repeated questions, batch embeddings, 429/503/400 handling | `app/main.py` (cache), `app/embeddings.py` |
| Key only in environment variables, never logged | `app/config.py`, `.env.example` |

## Quick start

```bash
pip install -r requirements.txt
python ingest.py                          # builds ./index  (local embeddings, offline, no quota)
python evaluate.py --calibrate            # retrieval metrics + threshold calibration (dev split)
uvicorn app.main:app --port 8001          # serve
```

Use Python 3.12 for the tested setup. Run `pip install -r requirements-dev.txt` to install the PDF/OCR
helpers and test dependencies. After building the local index, run `pytest -q` for the complete offline suite.
Retrieval work runs outside the API event loop, so embedding waits do not block other requests.
Request logs contain counts and timings only, never the question or answer text.

The ten Mathématiques Tome 2 chapters are all listed in the source manifest. Their reuse permission is
still **unverified** (`permission_verified=no`); normal local ingestion warns, and `--strict` refuses them.
Only the Probabilités chapter has undergone content review. The other chapters remain OCR drafts.

### Official platform demo

From `RAG/`, build and serve a separate index containing only sources with verified usage permissions.
The demo uses local embeddings, so retrieval needs no inference credential.

```powershell
python -m pip install -r requirements.txt
$env:INDEX_DIR = 'index/live'
python ingest.py --backend local --verified-only
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Try it:

```bash
curl -s localhost:8001/retrieve -H 'content-type: application/json' -d '{
  "question": "Quelle est la formule de la probabilité conditionnelle ?",
  "grade": "4eme_annee_secondaire", "section": "sciences_experimentales",
  "subject": "Mathematics", "content_type": "definition", "top_k": 4 }'
```

## The `/retrieve` contract (agree it with your teammate)

Request (only `question` is required):

```json
{ "question": "...", "grade": "4eme_annee_secondaire", "section": "sciences_experimentales",
  "subject": "Mathematics", "language": "fr", "content_type": "course|exercise|definition",
  "top_k": 4, "exclude_chunk_ids": ["math_4eme_se_001_chunk_002"] }
```

Response:

```json
{ "chunks": [ { "rank": 1, "chunk_id": "...", "document_id": "...", "content": "...", "score": 0.83,
                "scores": {"coverage": 0.9, "dense": 0.7, "bm25": 7.1, "rrf": 0.032},
                "metadata": {"country": "...", "grade": "...", "section": "...", "subject": "...", "topic": "...",
                             "heading": "...", "content_type": "...", "language": "fr", "source": "...", "page": 2} } ],
  "evidence_hint": "sufficient | partial | insufficient",
  "diagnostics": { "normalized_question": "...", "glossary_concepts": ["..."], "expanded_terms": ["..."], "chunks_after_filters": 20 },
  "cached": false, "latency_ms": 12.3 }
```

* `top_k` above 4 is silently capped to 4 (plan limit). Errors: `422` invalid body, `503` index missing or embeddings endpoint unavailable.
* `grade`, `section`, `subject`, `content_type` are **hard filters** (case/accent-insensitive). `language` is a soft preference: a French chunk may answer an Arabic question, that is the point of the glossary.
* `score` is a 0 to 1 relevance for ordering and display. `evidence_hint` is **advisory**: the plan puts the evidence checker in the agent. Its rule-based thresholds let your teammate skip the compact-model evidence call when the score is clearly high or clearly low (quota saving, plan page 10).
* Other endpoints: `GET /health`, `GET /stats` (cache hit rate, platform embedding calls).

Agent side (`rag_client.py` in the LLM service) only needs: `search_courses` -> `content_type="course"`, `search_exercises` -> `"exercise"`, `search_definitions` -> `"definition"`, passing the student's grade/section/subject, and `exclude_chunk_ids` on a second round.

## Data

```
data/documents/*.md        corpus (one file per document)
data/source_manifest.csv   origin + usage permission per document (ingest warns, or fails with --strict)
data/glossary_fr_ar.json   FR/AR/EN concept map + Derja words
data/eval_questions.jsonl  34 evaluation questions with gold (document, phrase) labels and a dev/test split
data/thresholds.json       evidence thresholds written by evaluate.py --calibrate --write-thresholds
```

**Document format** (`ingest.py` rejects files missing a header field):

```
---
document_id: math_4eme_se_001        # must equal the file name
grade: 4eme_annee_secondaire
section: sciences_experimentales
subject: Mathematics
topic: Continuity
content_type: course                 # default type: course | exercise | definition
language: fr
source: where it came from           # shown to the student as the citation
---
<!-- page: 1 -->                     # sets the page number of the text that follows
## Heading                           # a chunk never crosses a heading
<!-- type: definition -->            # switch content_type inside a document
text ...
```

Chunks are at most 900 characters, split at paragraph then sentence boundaries; an exercise statement and its solution stay in the same chunk (tested).

### Turning PDFs into documents: `pdf_to_draft.py`

```bash
python pdf_to_draft.py my.pdf --id math_4eme_se_010 --subject Mathematics --topic "Limits" \
    --language fr --source "Edunet - Maths 4eme SE, chap. 2" --pages 3-12 --add-manifest
```

* Per page: uses the PDF's text layer when it has one, otherwise OCR (Tesseract, French/Arabic/English). Use `--force-ocr` to OCR everything.
* Writes `data/documents/<id>.md` with the header and `<!-- page: N -->` markers, each page marked `<!-- REVIEW ... -->`, and (with `--add-manifest`) a manifest row with `permission_verified=no`.
* **It is a draft.** OCR makes mistakes (it read "AI" as "Al" in a test), Arabic and formulas are the weak spots, and headings and `<!-- type: definition|exercise|course -->` switches must be added by you. Delete the REVIEW lines when a page is checked.
* `python ingest.py --strict` refuses documents that still contain REVIEW markers or have an unverified permission.
* Needs `pdftotext`, `pdftoppm` (poppler) and `tesseract` with `fra`, `ara`, `eng` installed.

### Formula pages: `formula_ocr.py` (pix2tex, optional Mathpix)

Page OCR (`pdf_to_draft.py`) is weak on formulas. For the formulas that matter, screenshot each one, put the images in a folder and run:

```bash
python formula_ocr.py crops/*.png            # pix2tex, runs on your machine, writes formulas_out.md
python formula_ocr.py --latex "\\frac{p(A \\cap B)}{p(B)}"      # just convert LaTeX to plain text
```

It prints and saves, for each image, the plain-text form to paste into the document (`p(A ∩ B) / p(B)`, `u_n = u₀ × qⁿ`, `lim_(x → a) f(x) = f(a)`) and the LaTeX.

* **pix2tex** (default): open source, local, nothing leaves your computer, no extra service to declare. Install in a separate virtual environment: `pip install torch --index-url https://download.pytorch.org/whl/cpu` then `pip install pix2tex`; the model weights download on first run. It reads ONE formula image at a time, not a whole page.
* **Mathpix** (`--engine mathpix`): external paid service, your images are sent to a third party, so it is an **extra service to declare** in the report and must only be used on public material. Needs `MATHPIX_APP_ID` / `MATHPIX_APP_KEY` in the environment.
* **What is tested and what is not.** The LaTeX-to-plain-text converter and the script flow (with a stand-in model) are covered by tests. **The real pix2tex model and Mathpix were NOT run**: the sandbox this was built in could not install PyTorch. Try it on 5 formulas from your own documents before relying on it, and always compare each result with its image. pix2tex is trained on English-style LaTeX formulas, so expect errors on handwritten or unusual notation.
* For the few formulas it gets wrong, just retype them: plain text such as `p(A | B) = p(A ∩ B) / p(B)` is what the retriever needs.

### Templates

The [course template](templates/course_template.txt) and [exercise template](templates/exercise_template.txt) show the document format. Follow the [authoring instructions](templates/README.txt) and save completed sources as `data/documents/<document_id>.md`.

### IMPORTANT: the shipped corpus is a placeholder

The 10 documents (about 38 chunks: Maths 4ème sciences expérimentales, plus one Physics RC document; French, Arabic, English) are **synthetic sample content written for this demo**, not official curriculum and not copied from any textbook. They exist so the pipeline runs end to end. For the submission you should:

1. Replace/extend them with real, **permission-verified** public sources (Edunet Tunisia, Ministry of Education, Université Virtuelle de Tunis, ...), recording each in `source_manifest.csv` with `permission_verified=yes`, then run `python ingest.py --strict`.
2. Have a teacher or a native speaker review the Arabic documents and the glossary.
3. Keep public/synthetic/anonymised data only (spec ethics rule).

## Embeddings: local vs platform

* `EMBED_BACKEND=local` (default): deterministic hashing embeddings, offline, no quota. It is **lexical, not semantic**, so cross-language matching relies on the glossary. Good for development and for a quota-free demo.
* `EMBED_BACKEND=platform`: the organisers' OpenAI-compatible `/v1/embeddings`. Set `PLATFORM_BASE_URL` (without `/v1`), `PLATFORM_API_KEY`, `EMBED_MODEL` (a model listed by `/v1/models`) in the environment, re-run `python ingest.py --backend platform`, and re-run `evaluate.py --calibrate --write-thresholds` because score scales differ. Embeddings are batched; 429/503 wait the stated delay (`Retry-After`) and retry, 400 shrinks the batch. The plan lists "choose and test a multilingual embedding model on French, Arabic and English": do that comparison with `evaluate.py` (the ablation table shows dense-only vs hybrid).
* The spec says to use the platform's vector database (one collection per team). The index here is local files (`app/store.py`). To switch, replace `save_index`/`load_index` and the dense scoring step in `retrieval.py`; the rest is unchanged. **Declare any extra service in the report** (spec rule). Nothing here needs one.

## Evaluation: how to read it

`python evaluate.py` reports recall@1/3/5 and MRR on answerable questions, how the evidence hint splits across question types, and an ablation (BM25, dense, RRF, hybrid+rerank, +glossary). Thresholds are calibrated on the **dev** half only; report the **test** half (`--split test`). Plan advice: freeze the question set before tuning.

Current numbers on the shipped sample (local embeddings, 38 chunks, 27 answerable questions): recall@3 = 1.00, recall@1 about 0.90, all 4 unanswerable questions flagged `insufficient`; one ambiguous question ("Explique-moi le théorème qu'on a étudié hier") is rated `sufficient`. **Do not quote these as results.** The corpus is tiny and the questions were written by the same author as the documents, so they are easy. Retrieval cannot detect ambiguity from the question alone, which is why `ASK_CLARIFICATION` and conversation history belong in the agent.

## Known limits

* Local embeddings are lexical; expect lower recall on paraphrases once the corpus grows to 2,000+ chunks. Test the platform embedding model.
* The glossary covers only the sample subject; extend it per subject.
* Derja handling is a small word map, not a model.
* In-memory index and cache: fine for thousands of chunks, one process.
* `evidence_hint` thresholds depend on the embedding backend and corpus; recalibrate after any change.

## Layout

```
app/config.py       limits, paths, constants        app/embeddings.py  normalisation, tokens, local + platform embeddings
app/chunking.py     document parsing, chunking      app/bm25.py        BM25
app/glossary.py     FR/AR/EN glossary, Derja        app/retrieval.py   filters, hybrid search, rerank, evidence hint
app/store.py        index save/load                 app/main.py        FastAPI /retrieve, /health, /stats
ingest.py           build the index                 evaluate.py        metrics, ablation, calibration
pdf_to_draft.py     PDF (text layer or OCR) -> draft document
tests/              21 tests incl. mocked 429/503/400 handling
formula_ocr.py      formula image -> LaTeX -> plain text (pix2tex / Mathpix)
templates/          document templates
```
