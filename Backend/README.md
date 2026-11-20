# EdNova backend

FastAPI + SQLAlchemy + PostgreSQL. Accounts, learner profile, chat sessions, study-hour tracking.

All AI goes through **llm_service** (the agent, port 8100). The backend never calls a model directly and
holds no platform key: that key lives only in `llm_service/.env`. The agent only ever receives a
pseudonymous `learner_id` (HMAC-SHA256 of the user id with `SECRET_KEY`), never the pseudo, name or email.

Privacy rule: for each chat turn the database keeps metadata only (response id, badge, topic, latency,
time), never the student's message or the answer text.

## Ports

| Service      | Port | Folder        |
|--------------|------|---------------|
| RAG          | 8001 | `RAG/`        |
| Agent        | 8100 | `llm_service/`|
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

Start the agent (and the RAG service it uses) first; `AGENT_URL` defaults to `http://127.0.0.1:8100`.
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

Study rooms store their name, owner, invite code, members, posts and group sessions in PostgreSQL, so a
restart keeps them. Every member sees the invite code and can share it until the room is closed. The room
view lists the owner, the members seen in the last 45 seconds, and the current session round. Errors use
`{"detail": {"error": "room_not_found"}}` style codes. Members can view the roster, leave, and check their own explanations
with Nova. Nova's prompt to a silent member runs after the poll's response is sent. Explanations and feedback stay private to the caller. Closing a room or deleting its
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
| POST | `/groups/rooms/join` | Join by invite code with `{"code":"K7M2QX"}`; `already_member` says whether it was a rejoin |
| GET / DELETE | `/groups/rooms/{room_id}` | View the roster, leave as a member or close as the owner |
| POST | `/groups/rooms/{room_id}/check` | Check my explanation after verifying my room membership |
| POST | `/study/start` | Start a study session (idempotent); `{"minutes": 25}` sets a planned end where it closes itself |
| POST | `/study/stop` | Stop the running study session |
| GET | `/study/summary` | Minutes today / this week, streak in days (UTC), running session and its planned end |
| GET | `/study/sessions` | The 20 most recent finished study sessions with their minutes |

## Student plans

Apply `alembic upgrade head` before deploying the matching backend and connected preview. Profile reads and updates return a read-only `student_plan` field. Existing and new learners default to Free.

From `Backend/`, using the target environment’s database configuration, grant or remove Pro by pseudonym:

```bash
uv run python -m src.manage set-plan eleve01 pro
uv run python -m src.manage set-plan eleve01 free
```

Changes apply to the next gated request, including for signed-in learners. Personal quizzes, mistake-based practice shortcuts, hosting a session, duels, the interactive lab, the revision pack and timed Bac practice require Pro. Joining a session is Free when the room owner is Pro. Denials return `403` with `detail.error` set to `pro_required` and `detail.feature` identifying the action. Free learners can take the fixed sample quiz and participate in the room lobby and in sessions hosted by a Pro owner. Issued personal quizzes keep their normal expiry. Group session quizzes can be opened and graded by any member of a Pro-hosted room.

Free learners can request pilot access from the plan comparison. List pending pseudonyms with `uv run python -m src.manage pro-requests`. The existing `set-plan` command resolves the request.

## Group Sessions and Duel Exam

Apply `alembic upgrade head` before starting the backend. Both new and existing rooms default to Nova off. The room owner can enable Nova and separately enable automatic round prompts. The backend starts its deadline sweep, retention cleanup, and tutor job workers with the API. Live duels, ordinary room phases, and the published room quiz bank work with the agent offline.

The seeded duel blueprint `derivabilite-fr-v1` contains five French closed questions and a three-minute timer. Both duel players must be Pro room members. A Pro owner starts ordinary study-room rounds, and Pro room members can participate. Room members can withdraw consent at any time. The routine room bank covers 19 French chapters and derivatives in English and Arabic. A room quiz serves French and reports its language when the requested translation has insufficient inventory.

Nova can use curriculum context with no student text. Live room text additionally requires the `ROOM_TUTOR_ALLOW_RAW_TEXT` process environment setting on the backend and the learner's room consent. Enable that setting only after approving provider handling and the deployment's consent process. Each room member can independently enable or withdraw contribution and personalization.

The agent checks each room dispatch with the backend before contacting retrieval or inference. For separate hosts, set `ROOM_TUTOR_PERMIT_URL` in the agent environment to the backend's internal `/internal/room-tutor/permit` endpoint. The local default uses port 9999. The migration retires legacy automatic nudges, generated notes, and their member-keyed tracking state.

The API's OpenAPI schema documents the room, consent, tutor request, insight, and duel endpoints.

### Question bank operations

Run these from `Backend/`. The coverage report uses published inventory and eligible cohort concept IDs. The fill command invokes the configured agent and puts its results in the review queue.

```powershell
py -3.12 -m src.learning.bank_cli gaps --language en
py -3.12 -m src.learning.bank_cli fill suites en --source-version course-v1
py -3.12 -m src.learning.bank_cli pending --topic suites --language en
py -3.12 -m src.learning.bank_cli publish ITEM_ID --reviewer REVIEWER
```

Review the prompt, key, explanation, difficulty, and source before publishing. Use `reject ITEM_ID --reviewer REVIEWER` for unsuitable candidates. Generated items enter the ordinary practice pool. Versioned competitive questions stay in their reserved pool.

## Study tools

- `GET /learning/interactive-lab/{topic}` (Pro): curated activity for a catalogue topic; `404 lab_not_found` otherwise.
- `POST /learning/revision-pack/derivabilite` (Pro): cited pack from the agent's `/revision-pack`; `404 not_in_course` outside the fourth-year Sciences expérimentales profile.
- `POST /learning/revision-demo/completion` (Free): `204`, counted from the access log.
- `GET /learning/bac-practice/derivabilite` (Pro): five-question quiz with `duration_seconds: 600`, graded by `POST /learning/quiz/{quiz_id}/answers`.
