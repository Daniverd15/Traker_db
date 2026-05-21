"""
Q1 — Guardar un evento de combate en tiempo real
Q2 — Línea de tiempo de una ronda (todos los eventos ordenados)
Q3 — Eventos de un jugador específico en una partida
"""
from datetime import datetime
from bson import ObjectId
from pymongo.database import Database


# ── Q1: Insertar evento de telemetría ────────────────────────────────────────

def insertar_evento(
    db: Database,
    match_id: ObjectId,
    round_number: int,
    event_type: str,
    actor_id: ObjectId,
    weapon: str = "",
    target_id: ObjectId | None = None,
    damage: int = 0,
    headshot: bool = False,
    position: dict | None = None,
) -> ObjectId:
    """
    Q1 — Registra una acción del juego (daño, eliminación, habilidad) en tiempo real.
    Equivalente CQL:
        INSERT INTO eventos_by_partida_ronda
        (match_id, ronda, event_time, tipo, actor, daño)
        VALUES (?, ?, toTimestamp(now()), ?, ?, ?);
    """
    doc = {
        "match_id": match_id,
        "round_number": round_number,
        "event_time": datetime.utcnow(),
        "event_type": event_type,
        "actor_id": actor_id,
        "weapon": weapon,
        "damage": damage,
        "headshot": headshot,
        "position": position or {"x": 0.0, "y": 0.0},
    }
    if target_id:
        doc["target_id"] = target_id

    result = db["telemetry_events"].insert_one(doc)
    return result.inserted_id


# ── Q2: Línea de tiempo de una ronda ─────────────────────────────────────────

def linea_de_tiempo_ronda(
    db: Database,
    match_id: ObjectId,
    round_number: int,
    limit: int = 500,
) -> list[dict]:
    """
    Q2 — Todos los eventos de una ronda específica para replay y análisis.
    Equivalente CQL:
        SELECT * FROM eventos_by_partida_ronda
        WHERE match_id=? AND ronda=12
        ORDER BY event_time DESC LIMIT 500;
    """
    cursor = (
        db["telemetry_events"]
        .find(
            {"match_id": match_id, "round_number": round_number},
            {"_id": 0, "event_time": 1, "event_type": 1,
             "actor_id": 1, "weapon": 1, "damage": 1, "headshot": 1, "position": 1},
        )
        .sort("event_time", -1)
        .limit(limit)
    )
    return list(cursor)


# ── Q3: Eventos de un jugador en una partida ──────────────────────────────────

def eventos_jugador_partida(
    db: Database,
    player_id: ObjectId,
    match_id: ObjectId,
    limit: int = 1000,
) -> list[dict]:
    """
    Q3 — Todas las acciones de un jugador en una partida, ordenadas por tiempo.
    Equivalente CQL:
        SELECT * FROM eventos_by_jugador_partida
        WHERE player_id=? AND match_id=?
        ORDER BY event_time LIMIT 1000;
    """
    cursor = (
        db["telemetry_events"]
        .find(
            {"actor_id": player_id, "match_id": match_id},
            {"_id": 0, "round_number": 1, "event_time": 1,
             "event_type": 1, "weapon": 1, "damage": 1, "headshot": 1},
        )
        .sort("event_time", 1)
        .limit(limit)
    )
    return list(cursor)
