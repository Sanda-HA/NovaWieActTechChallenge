# Browser tests

Playwright tests that drive a real browser against the live backend. The suite drives the web app in `web/`. Locators use roles, labels and the French copy.

## Prerequisites

- The test Postgres container `ednova-test-pg` on `127.0.0.1:55432` (user and password `ednova`). Global setup creates the `ednova_e2e` database, migrates it and truncates `users`. The demo database is never touched.
- The agent (`llm_service`) on `127.0.0.1:8100`. Onboarding calls its `/diagnostic`, which makes no model call. Global setup fails with one sentence naming the agent when it is down.
- A Python environment that can run the backend (fastapi, alembic, uvicorn, psycopg). The suite uses `Backend/.venv/Scripts/python.exe` when it exists, then `EDNOVA_PYTHON`, then `python`. To create the venv: `python -m venv Backend/.venv`, then `Backend/.venv/Scripts/python.exe -m pip install -e "Backend[dev]"`.
- Node 22.

Playwright starts the e2e backend on port 9998 and the app server itself.

## Run

```
npm --prefix e2e install
npx --prefix e2e playwright install chromium   # first run only
npm --prefix e2e test
```

| Variable | Meaning | Default |
| --- | --- | --- |
| `EDNOVA_APP` | Must be `web` (serves the app with `npm --prefix web run e2e:serve`) | `web` |
| `EDNOVA_PYTHON` | Python used to run uvicorn and alembic when `Backend/.venv` is absent | `python` |
| `EDNOVA_E2E_PORT` | Port of the app under test | `4176` |

Two projects run: `desktop` (1280x800) for the smoke, sign-up, session, timer and rooms specs, and `mobile` (375x812) for the smoke and mobile specs.

The specs never send a tutor message or start a Nova room session, so they use no model quota. Each spec deletes its accounts in `afterAll`.
