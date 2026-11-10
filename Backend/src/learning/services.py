from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from .models import LearnerProfile
from .schemas import ProfileUpdate


def _profile(db, user):
    return db.scalar(select(LearnerProfile).where(LearnerProfile.user_id == user.id))


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
