# EdNova preview

From the repository root, build the preview with `node ui-preview/scripts/build.mjs`.

## Connected demo

1. Start the local PostgreSQL demo database and follow the [official platform setup](../llm_service/README.md#run-with-the-official-platform) for the agent on port 8100 and retrieval on port 8001.
2. In `Backend/`, set `DATABASE_URL` for the dedicated demo database, a local `SECRET_KEY`, and `AGENT_URL=http://127.0.0.1:8100`. Run `python -m alembic upgrade head`, then `python -m uvicorn src.main:app --host 127.0.0.1 --port 9999`.
3. From the repository root, run `node ui-preview/scripts/serve.mjs --live`. Open [the connected demo](http://127.0.0.1:4173/live.html) and register a fictional learner.
4. In Settings, select the Experimental Sciences baccalaureate track to try verified math and physics citations.

The preview serves only on loopback and forwards its connected API routes to FastAPI. The Tutor tab can open and switch between independent conversations, optionally scoped to a subject. Home links back to the last conversation. The token and transcripts live in memory for the current visit and clear on refresh or sign-out. The study timer, diagnostic score, and profile come from the backend.

Subject selection guides the tutor. Course citations are available where the indexed corpus covers the selected subject and profile. General explanations are labeled separately.

## Offline gallery

Run `node ui-preview/scripts/serve.mjs` and open [the review scenarios](http://127.0.0.1:4173/review.html). The offline entry uses fixtures and blocks browser connections with its content security policy.

Run frontend tests from the repository root with `node --test ui-preview/tests/*.test.mjs`. Run the backend suite with a separate disposable `TEST_DATABASE_URL`.

The bundled library and font notices are in [vendor/licenses](vendor/licenses/).
