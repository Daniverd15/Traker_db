from fastapi import APIRouter, Request, Query
from utils.serializer import serialize_doc
from queries.leaderboard import leaderboard_con_nicknames

router = APIRouter()


@router.get("/{season_id}")
def get_leaderboard(
    season_id: str,
    request: Request,
    metric: str = Query("kda"),
    limit: int = Query(20, le=100),
):
    db = request.app.state.db
    data = leaderboard_con_nicknames(db, season_id, metrica=metric, limit=limit)
    return serialize_doc(data)
