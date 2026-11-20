import argparse
import sys
from collections.abc import Sequence

from sqlalchemy import select

from .auth.models import User
from .Database.core import SessionLocal
from .learning.models import LearnerProfile
from .learning.services import get_or_create_profile


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Manage Ednova learner accounts.")
    commands = parser.add_subparsers(required=True, dest="command")
    commands.add_parser("pro-requests", help="List pending pilot access requests")
    set_plan = commands.add_parser("set-plan", help="Set a learner's plan by pseudonym")
    set_plan.add_argument("pseudo")
    set_plan.add_argument("plan", choices=("free", "pro"))
    args = parser.parse_args(argv)

    with SessionLocal() as db:
        if args.command == "pro-requests":
            query = select(User.pseudo).join(LearnerProfile, LearnerProfile.user_id == User.id).where(
                LearnerProfile.pro_requested.is_(True)
            ).order_by(User.pseudo)
            for pseudo in db.scalars(query):
                print(pseudo)
            return 0
        user = db.scalar(select(User).where(User.pseudo == args.pseudo))
        if user is None:
            print(f"Unknown learner: {args.pseudo}", file=sys.stderr)
            return 1
        profile = get_or_create_profile(db, user)
        # Serialize operator changes so the reported previous plan reflects the database.
        db.refresh(profile, with_for_update=True)
        previous = profile.student_plan
        profile.student_plan = args.plan
        profile.pro_requested = False
        db.commit()

    print(f"{args.pseudo}: {previous} -> {args.plan}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
