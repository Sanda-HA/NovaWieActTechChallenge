from fastapi import FastAPI
from .auth.controllers import router as auth_router
from .groups.controllers import router as groups_router
from .learning.controllers import router as learning_router
from .study.controllers import router as study_router
from .tutor.controllers import router as tutor_router

def register_routes(app: FastAPI):
    app.include_router(auth_router)
    app.include_router(learning_router)
    app.include_router(tutor_router)
    app.include_router(groups_router)
    app.include_router(study_router)
