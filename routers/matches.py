from fastapi import APIRouter, Request, HTTPException, Query
from bson import ObjectId
from pymongo import DESCENDING
from utils.serializer import serialize_doc
from queries.telemetry import linea_de_tiempo_ronda

router = APIRouter()


@router.get("/")
def list_matches(
    request: Request,
    mapa: str | None = Query(None),
    agente: str | None = Query(None),
    limit: int = Query(20, le=100),
):
    db = request.app.state.db
    filtro: dict = {}
    if mapa:
        filtro["map"] = mapa
    if agente:
        filtro["player_agents.agent"] = agente

    matches = list(
        db["matches"]
        .find(filtro, {"_id": 1, "map": 1, "start_time": 1, "end_time": 1,
                       "match_type": 1, "winning_team_id": 1, "player_agents": 1,
                       "teams": 1})
        .sort("start_time", DESCENDING)
        .limit(limit)
    )

    # Inyectar nombres de equipos en el listado
    for m in matches:
        for t in m.get("teams", []):
            t_doc = db["teams"].find_one({"_id": t["team_id"]}, {"name": 1})
            t["name"] = t_doc["name"] if t_doc else "Desconocido"

    return serialize_doc(matches)


@router.get("/{match_id}")
def get_match(match_id: str, request: Request):
    db = request.app.state.db
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    match = db["matches"].find_one({"_id": oid})
    if not match:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    # Enriquecer teams con nombre, región, score y resultado
    teams_info = []
    for t in match.get("teams", []):
        t_doc = db["teams"].find_one({"_id": t["team_id"]}, {"name": 1, "region": 1})
        score = sum(
            1 for r in match.get("rounds", [])
            if r.get("winning_team_id") == t["team_id"]
        )
        teams_info.append({
            "team_id":   t["team_id"],
            "side":      t["side"],
            "name":      t_doc["name"]           if t_doc else "Desconocido",
            "region":    t_doc.get("region", "") if t_doc else "",
            "score":     score,
            "is_winner": t["team_id"] == match.get("winning_team_id"),
        })

    match["teams_info"] = teams_info
    return serialize_doc(match)


@router.get("/{match_id}/stats")
def match_stats(match_id: str, request: Request):
    db = request.app.state.db
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    match_doc = db["matches"].find_one({"_id": oid}, {"teams": 1})
    if not match_doc:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    teams = match_doc.get("teams", [])

    # Obtener nombre y región de cada equipo
    team_meta: dict = {}
    for t in teams:
        t_doc = db["teams"].find_one({"_id": t["team_id"]}, {"name": 1, "region": 1})
        team_meta[t["team_id"]] = {
            "name":   t_doc["name"]           if t_doc else "Desconocido",
            "region": t_doc.get("region", "") if t_doc else "",
            "side":   t["side"],
        }

    # Stats con team_id del jugador incluido
    pipeline = [
        {"$match": {"match_id": oid}},
        {"$lookup": {
            "from":         "players",
            "localField":   "player_id",
            "foreignField": "_id",
            "as":           "player",
        }},
        {"$unwind": "$player"},
        {"$project": {
            "_id": 0, "agent": 1, "kills": 1, "deaths": 1,
            "assists": 1, "damage_total": 1, "kda": 1, "acs": 1,
            "headshot_pct": 1,
            "nickname": "$player.nickname",
            "country":  "$player.country",
            "team_id":  "$player.team_id",
        }},
        {"$sort": {"acs": -1}},
    ]

    all_stats = serialize_doc(list(db["player_match_stats"].aggregate(pipeline)))

    # Agrupar por equipo manteniendo el orden de la partida
    result = []
    for t in teams:
        tid_str = str(t["team_id"])
        meta    = team_meta.get(t["team_id"], {})
        result.append({
            "team_id": tid_str,
            "name":    meta.get("name",   "Desconocido"),
            "region":  meta.get("region", ""),
            "side":    meta.get("side",   ""),
            "players": [s for s in all_stats if s.get("team_id") == tid_str],
        })

    return result


@router.get("/{match_id}/timeline-player")
def player_timeline(match_id: str, player_id: str, request: Request,
                    limit: int = Query(50, le=500)):
    """Q3 — Eventos de un jugador en una partida, ordenados por tiempo."""
    db = request.app.state.db
    try:
        m_oid = ObjectId(match_id)
        p_oid = ObjectId(player_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    events = list(
        db["telemetry_events"].find(
            {"match_id": m_oid, "actor_id": p_oid},
            {"_id": 0, "round_number": 1, "event_time": 1,
             "event_type": 1, "weapon": 1, "damage": 1, "headshot": 1},
        ).sort("event_time", 1).limit(limit)
    )
    return serialize_doc(events)


@router.get("/{match_id}/rounds-summary")
def rounds_summary(match_id: str, request: Request):
    """Kills por ronda para toda la partida — alimenta el gráfico del timeline."""
    db = request.app.state.db
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    pipeline = [
        {"$match": {"match_id": oid, "event_type": "kill"}},
        {"$group": {"_id": "$round_number", "kills": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "round": "$_id", "kills": 1}},
    ]
    return list(db["telemetry_events"].aggregate(pipeline))


@router.get("/{match_id}/timeline/{round_number}")
def round_timeline(match_id: str, round_number: int, request: Request):
    """Solo eventos kill de la ronda, con nombres de asesino y víctima."""
    db = request.app.state.db
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    kills = list(
        db["telemetry_events"].find(
            {"match_id": oid, "round_number": round_number, "event_type": "kill"},
            {"_id": 0, "event_time": 1, "actor_id": 1, "target_id": 1,
             "weapon": 1, "damage": 1, "headshot": 1},
        ).sort("event_time", 1)
    )

    # Resolver actor_id / target_id → nickname
    player_ids = {k["actor_id"] for k in kills if k.get("actor_id")}
    player_ids |= {k["target_id"] for k in kills if k.get("target_id")}

    name_map = {}
    if player_ids:
        for p in db["players"].find(
            {"_id": {"$in": list(player_ids)}}, {"_id": 1, "nickname": 1}
        ):
            name_map[p["_id"]] = p["nickname"]

    result = [
        {
            "event_time": k.get("event_time"),
            "killer":     name_map.get(k.get("actor_id"),  "?"),
            "victim":     name_map.get(k.get("target_id"), "?"),
            "weapon":     k.get("weapon", ""),
            "damage":     k.get("damage", 0),
            "headshot":   k.get("headshot", False),
        }
        for k in kills
    ]
    return serialize_doc(result)
