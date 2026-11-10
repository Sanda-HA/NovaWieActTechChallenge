import hashlib
import hmac
import uuid

from .config import settings


def learner_pseudonym(user_id: uuid.UUID) -> str:
    """Stable id sent to llm_service instead of anything that identifies the student."""
    digest = hmac.new(settings.secret_key.encode(), str(user_id).encode(), hashlib.sha256)
    return digest.hexdigest()[:32]
