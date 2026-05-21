"""
Q4 — Partidas filtradas por mapa y agente (análisis de composición)
"""
from pymongo.database import Database


def partidas_por_mapa_agente(
    db: Database,
    mapa: str,
    agente: str,
    limit: int = 50,
) -> list[dict]:
    """
    Q4 — Encuentra partidas jugadas en un mapa donde se usó un agente concreto.
    Equivalente CQL:
        SELECT * FROM partidas_by_mapa_agente
        WHERE mapa='Ascent' AND agente='Jett'
        LIMIT 50;
    """
    cursor = (
        db["matches"]
        .find(
            {"map": mapa, "player_agents.agent": agente},
            {"_id": 1, "map": 1, "start_time": 1,
             "match_type": 1, "winning_team_id": 1,
             "player_agents": 1},
        )
        .sort("start_time", -1)
        .limit(limit)
    )
    return list(cursor)


def detalle_partida(db: Database, match_id) -> dict | None:
    """Retorna el documento completo de una partida incluidas sus rondas."""
    return db["matches"].find_one({"_id": match_id})
