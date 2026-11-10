# EdNova LLM service

The study-partner agent of EdNova: a capacity-aware orchestrator over the WIE ACT 5.0 inference platform
(compact and larger model classes, CPU-only, quota-limited) and the team's course retrieval service.

## Run with the official platform

1. Python 3.11+. `python -m venv .venv`, activate it, `pip install -e ".[dev]"`.
2. In `llm_service/`, copy `.env.example` to `.env` and add the team key. The agent reads this file at startup. Shell variables take precedence.
3. Start the [verified-source retrieval service](../RAG/README.md#official-platform-demo) and run `python -m uvicorn app.api.main:create_app --factory --host 127.0.0.1 --port 8100` from `llm_service/`.
4. Set the backend's `AGENT_URL=http://127.0.0.1:8100` and start the [connected UI](../ui-preview/README.md).

Use only the assigned Tunis-time slot. Run one agent worker per team key and keep benchmarks or other
clients using that key stopped while the demo runs. The agent caps outbound chat attempts (including
retries) at 20 per rolling minute and two in flight. It uses the platform's non-streaming chat endpoint,
exposes its own stage events to the backend, and the connected UI shows a waiting indicator.

The live profile uses `qwen2.5-3b` for triage and short structured steps and
`qwen2.5-coder-7b` for multi-source synthesis, repair, and hint ladders. Confirm IDs through the
authenticated `GET /v1/models` endpoint when changing models.

Run `pytest -q` from `llm_service/` for offline tests with mocked inference.

## Security

This is an internal service. Bind it to `127.0.0.1` when the team backend runs on the same host, or to a
private network interface accessible only to that backend. The backend is the sole API caller and supplies
`session_id` and `learner_id` from its own authenticated login and session handling.

## How it works

Chat generation, including time waiting for a learner's previous turn, is limited by `REQUEST_TIMEOUT_S`
(45 seconds by default). On expiry the agent returns a course passage, or a retry message if retrieval
does not finish within `FALLBACK_TIMEOUT_S` (5 more seconds). Timed-out requests are degraded and are never
cached. The standalone checker uses the same generation limit and returns `unknown` with a guiding
question on timeout. Wellbeing messages bypass a learner's queued ordinary turn.

Shared model calls survive a single subscriber disconnecting, but are cancelled when their last
subscriber leaves. The first delivered receipt counts the shared call once.

Generated answers and hint ladders use an in-memory cache only. They disappear on restart; `CACHE_PATH`
does not enable disk storage. Evidence-cache reuse also requires the original redacted question, so two
different questions are never treated as equivalent just because triage rewrites them the same way.

The backend deletes agent data through internal `DELETE /learner/{learner_id}` with
`{"session_ids": ["owned-session-id", "..."]}`. It removes the learner profile and those runtime conversations,
waits for active learner turns to finish, and rejects later writes for that learner until the process restarts.

## Evaluation

`python -m evaluation.benchmark --configs A B C compact` compares routing variants on synthetic
questions. The offline test suite covers quota, concurrency, and saturation responses.

## External services declared

None in the LLM service. All inference goes through the platform API; retrieval goes through the team's
RAG service. Its default setup currently uses local hashing embeddings and a local index. Platform
embeddings are configurable; a platform vector-database integration has not been verified.
