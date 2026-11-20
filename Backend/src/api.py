from fastapi import FastAPI
from .auth.controllers import router as auth_router
from .groups.controllers import router as groups_router
from .groups.duel_controllers import router as duels_router
from .groups.insight_controllers import router as insights_router
from .groups.room_tutor import permit_router as room_tutor_permit_router
from .learning.controllers import router as learning_router
from .learning.mind_maps import router as mind_maps_router
from .study.controllers import router as study_router
from .tutor.controllers import router as tutor_router

def register_routes(app: FastAPI):
    app.include_router(auth_router)
    app.include_router(learning_router)
    app.include_router(mind_maps_router)
    app.include_router(tutor_router)
    app.include_router(groups_router)
    app.include_router(duels_router)
    app.include_router(insights_router)
    app.include_router(room_tutor_permit_router)
    app.include_router(study_router)
