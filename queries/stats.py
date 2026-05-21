"""
Q5 — Guardar / recuperar estadísticas K/D/A de un jugador en una partida
"""
from datetime import datetime
from bson import ObjectId
from pymongo.database import Database
from pymongo import ReturnDocument


def guardar_stats_partida(
    db: Database,
    match_id: ObjectId,
    player_id: ObjectId,
    agent: str,
    kills: int,
    deaths: int,
    assists: int,
    damage_total: int,
    headshot_pct: float = 0.0,
) -> dict:
    """
    Q5 — Persiste K/D/A, daño y HS% al finalizar la partida.
    Usa upsert para ser idempotente ante re-envíos.
    Equivalente CQL:
        INSERT INTO stats_jugador_partida
        (match_id, player_id, kills, deaths, assists, daño_total)
        VALUES (?, ?, ?, ?, ?, ?);
    """
    kda = round((kills + assists * 0.5) / max(deaths, 1), 2)
    doc = {
        "match_id": match_id,
        "player_id": player_id,
        "agent": agent,
        "kills": kills,
        "deaths": deaths,
        "assists": assists,
        "damage_total": damage_total,
        "headshot_pct": headshot_pct,
        "kda": kda,
        "created_at": datetime.utcnow(),
    }
    result = db["player_match_stats"].find_one_and_update(
        {"match_id": match_id, "player_id": player_id},
        {"$set": doc},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return result


def stats_jugador_partida(
    db: Database,
    match_id: ObjectId,
    player_id: ObjectId,
) -> dict | None:
    """Recupera las estadísticas de un jugador en una partida específica."""
    return db["player_match_stats"].find_one(
        {"match_id": match_id, "player_id": player_id},
        {"_id": 0},
    )


def top_jugadores_partida(
    db: Database,
    match_id: ObjectId,
    metrica: str = "kda",
    limit: int = 10,
) -> list[dict]:
    """Retorna los jugadores ordenados por métrica dentro de una partida."""
    cursor = (
        db["player_match_stats"]
        .find(
            {"match_id": match_id},
            {"_id": 0, "player_id": 1, "agent": 1,
             "kills": 1, "deaths": 1, "assists": 1,
             "damage_total": 1, "kda": 1, "acs": 1},
        )
        .sort(metrica, -1)
        .limit(limit)
    )
    return list(cursor)
