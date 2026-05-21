from fastapi import APIRouter, Request, HTTPException
from bson import ObjectId
from pymongo import DESCENDING
from utils.serializer import serialize_doc

router = APIRouter()


@router.get("/")
def list_players(request: Request):
    db = request.app.state.db
    pipeline = [
        {"$lookup": {
            "from": "teams",
            "localField": "team_id",
            "foreignField": "_id",
            "as": "team",
        }},
        {"$unwind": {"path": "$team", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 1, "nickname": 1, "country": 1,
            "role": 1, "rank": 1, "team_name": "$team.name",
        }},
    ]
    return serialize_doc(list(db["players"].aggregate(pipeline)))


@router.get("/{player_id}")
def get_player(player_id: str, request: Request):
    db = request.app.state.db
    try:
        oid = ObjectId(player_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    player = db["players"].find_one({"_id": oid})
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    stats = list(
        db["player_match_stats"]
        .find(
            {"player_id": oid},
            {"_id": 0, "match_id": 1, "agent": 1, "kills": 1, "deaths": 1,
             "assists": 1, "damage_total": 1, "kda": 1, "acs": 1},
        )
        .sort("created_at", DESCENDING)
        .limit(10)
    )

    result = serialize_doc(player)
    result["stats_history"] = serialize_doc(stats)
    return result
