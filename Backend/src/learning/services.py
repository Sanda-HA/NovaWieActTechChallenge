from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from ..student_plans import StudentPlan
from .models import LearnerProfile
from .schemas import MistakePracticeIn, ProfileUpdate


def _profile(db, user):
    return db.scalar(select(LearnerProfile).where(LearnerProfile.user_id == user.id))


def student_plan_for(db, user_id) -> StudentPlan:
    return db.scalar(select(LearnerProfile.student_plan).where(LearnerProfile.user_id == user_id)) or "free"


def get_or_create_profile(db, user):
    if profile := _profile(db, user):
        return profile
    profile = LearnerProfile(user_id=user.id)
    db.add(profile)
    try:
        db.commit()
    except IntegrityError:  # a concurrent first request created it
        db.rollback()
        return _profile(db, user)
    db.refresh(profile)
    return profile


def update_profile(db, user, data: ProfileUpdate):
    profile = get_or_create_profile(db, user)
    updates = data.model_dump(exclude_none=True)
    if "presentation" in data.model_fields_set:
        updates["presentation"] = data.presentation
    for field, value in updates.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


def mistake_prompt(language: str, mistake: dict, data: MistakePracticeIn) -> str:
    label = mistake.get("label")
    topic = label[:200] if isinstance(label, str) and label.strip() else data.topic
    if language == "en":
        kind = {"concept": "conceptual", "calculation": "calculation", "notation": "notation",
                "incomplete": "incomplete reasoning"}[data.type]
        return f"Give me a guided exercise on {topic} to practise correcting this type of error: {kind}."
    if language == "ar":
        kind = {"concept": "المفاهيم", "calculation": "الحساب", "notation": "الترميز",
                "incomplete": "الاستدلال غير المكتمل"}[data.type]
        return f"اقترح تمرينًا موجّهًا حول {topic} لأتدرّب على تصحيح هذا الخطأ: {kind}."
    kind = {"concept": "notion mal comprise", "calculation": "calcul", "notation": "notation",
            "incomplete": "raisonnement incomplet"}[data.type]
    return f"Propose un exercice guidé sur {topic} pour retravailler ce type d’erreur : {kind}."
