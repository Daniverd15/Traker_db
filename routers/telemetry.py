from fastapi import APIRouter, Request
from pydantic import BaseModel
from bson import ObjectId
from queries.telemetry import insertar_evento

router = APIRouter()


class TelemetryEventIn(BaseModel):
    match_id: str
    round_number: int
    event_type: str
    actor_id: str
    target_id: str | None = None
    weapon: str = ""
    damage: int = 0
    headshot: bool = False
    position: dict = {"x": 0.0, "y": 0.0}


@router.post("/")
def create_event(event: TelemetryEventIn, request: Request):
    db = request.app.state.db
    eid = insertar_evento(
        db,
        match_id=ObjectId(event.match_id),
        round_number=event.round_number,
        event_type=event.event_type,
        actor_id=ObjectId(event.actor_id),
        target_id=ObjectId(event.target_id) if event.target_id else None,
        weapon=event.weapon,
        damage=event.damage,
        headshot=event.headshot,
        position=event.position,
    )
    return {"event_id": str(eid)}
