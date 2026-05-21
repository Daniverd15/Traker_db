"""
Q6 — Leaderboard top-N por métrica y temporada
"""
from datetime import datetime
from bson import ObjectId
from pymongo.database import Database
from pymongo import DESCENDING


def top_n_leaderboard(
    db: Database,
    season_id: str,
    metrica: str = "kda",
    limit: int = 20,
) -> list[dict]:
    """
    Q6 — Top-N jugadores ordenados por la métrica indicada en la temporada.
    Equivalente CQL:
        SELECT player_id, valor FROM leaderboard_by_temporada
        WHERE season_id=? AND metrica='kda'
        ORDER BY valor DESC LIMIT 20;
    """
    cursor = (
        db["season_leaderboards"]
        .find(
            {"season_id": season_id, "metric": metrica},
            {"_id": 0, "player_id": 1, "value": 1, "position": 1},
        )
        .sort("value", DESCENDING)
        .limit(limit)
    )
    return list(cursor)


def actualizar_leaderboard(
    db: Database,
    season_id: str,
    metrica: str,
    player_id: ObjectId,
    nuevo_valor: float,
) -> None:
    """
    Actualiza el valor de un jugador en el leaderboard y recalcula posiciones.
    Se llama después de cada partida para mantener el ranking vigente.
    """
    db["season_leaderboards"].update_one(
        {"season_id": season_id, "metric": metrica, "player_id": player_id},
        {"$set": {"value": nuevo_valor, "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    # Recalcular posiciones del leaderboard completo para esa métrica
    entries = list(
        db["season_leaderboards"]
        .find({"season_id": season_id, "metric": metrica})
        .sort("value", DESCENDING)
    )
    bulk = []
    from pymongo import UpdateOne
    for pos, entry in enumerate(entries, start=1):
        bulk.append(
            UpdateOne({"_id": entry["_id"]}, {"$set": {"position": pos}})
        )
    if bulk:
        db["season_leaderboards"].bulk_write(bulk)


def leaderboard_con_nicknames(
    db: Database,
    season_id: str,
    metrica: str = "kda",
    limit: int = 20,
) -> list[dict]:
    """
    Q6 enriquecida — Top-N con nickname del jugador usando $lookup.
    """
    pipeline = [
        {"$match": {"season_id": season_id, "metric": metrica}},
        {"$sort":  {"value": DESCENDING}},
        {"$limit": limit},
        {
            "$lookup": {
                "from":         "players",
                "localField":   "player_id",
                "foreignField": "_id",
                "as":           "player",
            }
        },
        {"$unwind": "$player"},
        {
            "$project": {
                "_id": 0,
                "position": 1,
                "value": 1,
                "nickname": "$player.nickname",
                "country":  "$player.country",
                "rank":     "$player.rank",
            }
        },
    ]
    return list(db["season_leaderboards"].aggregate(pipeline))
