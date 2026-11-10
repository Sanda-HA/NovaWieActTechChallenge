# EdNova backend

FastAPI + SQLAlchemy + PostgreSQL. Accounts, learner profile, chat sessions, study-hour tracking.

All AI goes through **llm_service** (the agent, port 8000). The backend never calls a model directly and
holds no platform key: that key lives only in `llm_service/.env`. The agent only ever receives a
pseudonymous `learner_id` (HMAC-SHA256 of the user id with `SECRET_KEY`), never the pseudo, name or email.

Privacy rule: for each chat turn the database keeps metadata only (response id, badge, topic, latency,
time), never the student's message or the answer text.

## Ports

| Service      | Port | Folder        |
|--------------|------|---------------|
| RAG          | 8001 | `RAG/`        |
| Agent        | 8000 | `llm_service/`|
| Backend      | 9999 | `Backend/`    |

## Run

From `Backend/` (Python 3.10+):

```bash
python -m venv .venv
.venv/Scripts/activate            # Linux/macOS: source .venv/bin/activate
pip install -e .                  # or: uv sync
cp .env.example .env              # then fill SECRET_KEY and DATABASE_URL
```

A PostgreSQL database is required. For local development, Docker is the quickest:

```bash
docker run -d --name ednova-pg -e POSTGRES_USER=ednova -e POSTGRES_PASSWORD=ednova -e POSTGRES_DB=ednova -p 5432:5432 postgres:16-alpine
```

`DATABASE_URL` must use the psycopg driver, e.g. `postgresql+psycopg://ednova:ednova@127.0.0.1:5432/ednova`.

```bash
alembic upgrade head
uvicorn src.main:app --port 9999
```

Start the agent (and the RAG service it uses) first; `AGENT_URL` defaults to `http://127.0.0.1:8000`.
If the agent is down, AI routes answer `503 {"detail": {"error": "agent_unavailable"}}`; if it is out of
capacity, `503 {"detail": {"error": "agent_busy", "retry_after": <seconds>}}` with a `Retry-After` header.

API docs: http://127.0.0.1:9999/docs

## Tests

Tests need a PostgreSQL database of their own (they drop and recreate every table). By default they use
`postgresql+psycopg://ednova:ednova@127.0.0.1:55432/ednova_test`; override with `TEST_DATABASE_URL`.
The agent is mocked, so it does not need to run. Install the test and lint tools with
`pip install -e ".[dev]"` or `uv sync --extra dev`.

```bash
docker run -d --rm --name ednova-test-pg -e POSTGRES_USER=ednova -e POSTGRES_PASSWORD=ednova -e POSTGRES_DB=ednova_test -p 127.0.0.1:55432:5432 postgres:16-alpine
pytest -q
ruff check .
```

## Endpoints

All routes except register/login need `Authorization: Bearer <token>`.

New accounts default to French (`fr`), matching the tutoring profile. Existing accounts and explicit
language selections are unchanged. Unresponsive agent requests have an overall 60-second limit;
malformed responses return a controlled 502 and unfinished or stalled streams end with an error event.

Study rooms store their name, owner, invite code and members in PostgreSQL. The owner can share the
code until the room is closed. Members can view the roster, leave, and check their own explanations
with Nova. Explanations and feedback stay private to the caller. Closing a room or deleting its
owner removes the room and its memberships. The legacy `/groups/{room_id}/check` remains a
standalone checker. Use `/groups/rooms/{room_id}/check` for a check that requires membership.

Account deletion first purges the agent's learner profile and runtime conversations, then deletes the
PostgreSQL account and dependent rows. The agent must be available; otherwise the route returns 503 and
the account is retained so deletion can be retried. Update backend and agent together for this operation.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account (pseudo + password) |
| POST | `/auth/login` | Get a bearer token (OAuth2 password form) |
| GET | `/auth/me` | Current account |
| DELETE | `/auth/me` | Delete the account and everything linked to it |
| GET | `/me/profile` | Learner profile (created with defaults on first read) |
| PUT | `/me/profile` | Update level, format, grade, section, subject, reply language… |
| POST | `/tutor/sessions` | Start a chat session, optionally with `{"subject":"physics"}`; an empty request keeps the profile default |
| GET | `/tutor/sessions` | List my sessions (last topic, message count) |
| POST | `/tutor/sessions/{id}/messages` | Ask the agent (`mode` explain/guided, `action` auto/hint/attempt/new_question) |
| POST | `/tutor/sessions/{id}/messages/stream` | Same, as Server-Sent Events (`stage`, `result`, `error`) |
| POST | `/tutor/feedback` | Thumbs up/down on one of my answers |
| GET | `/learning/diagnostic` | Diagnostic quiz items |
| POST | `/learning/diagnostic` | Submit diagnostic answers |
| GET | `/learning/progress` | My mastery per topic |
| POST | `/groups/{room_id}/check` | Standalone explanation check; room_id is legacy client context |
| GET / POST | `/groups/rooms` | List my rooms or create a room with `{"name":"Révisions"}` |
| POST | `/groups/rooms/join` | Join by invite code with `{"code":"<uuid>"}` |
| GET / DELETE | `/groups/rooms/{room_id}` | View the roster, leave as a member or close as the owner |
| POST | `/groups/rooms/{room_id}/check` | Check my explanation after verifying my room membership |
| POST | `/study/start` | Start timing a study session (idempotent) |
| POST | `/study/stop` | Stop the running study session |
| GET | `/study/summary` | Minutes today / this week, streak in days (UTC) |
