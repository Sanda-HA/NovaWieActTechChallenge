import uuid
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from ..ai.interface import Agent
from ..auth.services import CurrentUser
from ..Database.core import DbSession
from . import services
from .schemas import FeedbackIn, MessageIn, SessionCreate, SessionOut
from ..contracts import ChatResult, FeedbackResult, StageEvent, ErrorEvent

def stream_schema():
    # Inline definitions make SSE event models discoverable without a JSON response model.
    result = ChatResult.model_json_schema(ref_template="#/components/schemas/{model}")
    result.pop("$defs", None)  # Nested models already belong to the JSON endpoint's components.
    return {"stage": StageEvent.model_json_schema(), "result": result, "error": ErrorEvent.model_json_schema()}

router = APIRouter(prefix="/tutor", tags=["tutor"])

@router.post("/sessions", response_model=SessionOut, status_code=201)
def create_session(user: CurrentUser, db: DbSession, data: SessionCreate | None = None):
    return services.create_session(db, user, data.subject if data else None)

@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(user: CurrentUser, db: DbSession):
    return services.list_sessions(db, user)

@router.post("/sessions/{session_id}/messages", response_model=ChatResult, response_model_exclude_unset=True)
async def send_message(session_id: uuid.UUID, data: MessageIn, user: CurrentUser, db: DbSession, agent: Agent):
    session = services.get_owned_session(db, user, session_id)
    return await services.send_message(db, agent, user, session, data)

@router.post("/sessions/{session_id}/messages/stream", response_class=StreamingResponse,
             responses={200: {"content": {"text/event-stream": {"schema": {"type": "string"}}}}},
             openapi_extra={"x-sse-events": stream_schema()})
async def stream_message(session_id: uuid.UUID, data: MessageIn, user: CurrentUser, db: DbSession, agent: Agent):
    session = services.get_owned_session(db, user, session_id)
    events = await services.stream_message(db, agent, user, session, data)
    return StreamingResponse(events, media_type="text/event-stream")

@router.post("/feedback", response_model=FeedbackResult, response_model_exclude_unset=True)
async def feedback(data: FeedbackIn, user: CurrentUser, db: DbSession, agent: Agent):
    return await services.send_feedback(db, agent, user, data)
