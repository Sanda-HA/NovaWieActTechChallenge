import asyncio
import logging
import time

from ..Database.core import SessionLocal
from . import duel_services, group_memory, room_tutor


logger = logging.getLogger("ednova.groups")


def _sweep(expire_content: bool):
    with SessionLocal() as db:
        duel_services.sweep_deadlines(db)
        if expire_content:
            group_memory.expire(db)


async def maintain_groups():
    next_expiry = 0.0
    while True:
        now = time.monotonic()
        expire_content = now >= next_expiry
        try:
            await asyncio.to_thread(_sweep, expire_content)
            if expire_content:
                next_expiry = now + 3600
        except Exception as exc:
            logger.warning("Group maintenance failed (%s)", type(exc).__name__)
            await asyncio.sleep(4)
        await asyncio.sleep(1)


async def dispatch_tutor_jobs(agent):
    while True:
        try:
            worked = await room_tutor.run_one_job(agent)
        except Exception as exc:
            logger.warning("Room tutor dispatch failed (%s)", type(exc).__name__)
            await asyncio.sleep(4)
            continue
        if not worked:
            await asyncio.sleep(1)
