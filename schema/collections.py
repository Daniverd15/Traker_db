"""
Crea colecciones con validadores JSON Schema e índices optimizados
para el patrón de consulta de cada entidad.
"""
from pymongo.database import Database
from pymongo import ASCENDING, DESCENDING


def setup_collections(db: Database) -> None:
    existing = db.list_collection_names()

    # ── PLAYERS ──────────────────────────────────────────────────────────────
    if "players" not in existing:
        db.create_collection(
            "players",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["nickname", "country", "role", "rank"],
                    "properties": {
                        "nickname": {"bsonType": "string"},
                        "country":  {"bsonType": "string", "maxLength": 3},
                        "role":     {"bsonType": "string",
                                     "enum": ["Duelista", "Centinela",
                                              "Controlador", "Iniciador"]},
                        "rank":     {"bsonType": "string"},
                    },
                }
            },
        )

    db["players"].create_index([("nickname", ASCENDING)], unique=True)
    db["players"].create_index([("team_id", ASCENDING)])
    db["players"].create_index([("rank", ASCENDING)])

    # ── TEAMS ─────────────────────────────────────────────────────────────────
    if "teams" not in existing:
        db.create_collection(
            "teams",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["name", "region", "season_id"],
                    "properties": {
                        "name":      {"bsonType": "string"},
                        "region":    {"bsonType": "string"},
                        "season_id": {"bsonType": "string"},
                    },
                }
            },
        )

    db["teams"].create_index([("name", ASCENDING)], unique=True)
    db["teams"].create_index([("region", ASCENDING), ("season_id", ASCENDING)])

    # ── AGENTS ───────────────────────────────────────────────────────────────
    if "agents" not in existing:
        db.create_collection(
            "agents",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["name", "role"],
                    "properties": {
                        "name": {"bsonType": "string"},
                        "role": {"bsonType": "string",
                                 "enum": ["Duelista", "Centinela",
                                          "Controlador", "Iniciador"]},
                    },
                }
            },
        )

    db["agents"].create_index([("name", ASCENDING)], unique=True)
    db["agents"].create_index([("role", ASCENDING)])

    # ── MATCHES ───────────────────────────────────────────────────────────────
    # Las rondas se embeben aquí porque son ≤25 por partida (documento acotado).
    if "matches" not in existing:
        db.create_collection(
            "matches",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["map", "start_time", "match_type"],
                    "properties": {
                        "map":        {"bsonType": "string"},
                        "start_time": {"bsonType": "date"},
                        "match_type": {"bsonType": "string",
                                       "enum": ["competitivo", "torneo",
                                                "scrim", "entrenamiento"]},
                        "rounds": {
                            "bsonType": "array",
                            "items": {
                                "bsonType": "object",
                                "required": ["round_number", "win_condition"],
                                "properties": {
                                    "round_number":  {"bsonType": "int"},
                                    "win_condition": {
                                        "bsonType": "string",
                                        "enum": ["eliminacion", "bomba_detonada",
                                                 "bomba_desactivada", "tiempo_agotado"],
                                    },
                                },
                            },
                        },
                    },
                }
            },
        )

    # Q4: filtrar por mapa + agente usado
    db["matches"].create_index([("map", ASCENDING),
                                 ("player_agents.agent", ASCENDING)])
    db["matches"].create_index([("start_time", DESCENDING)])
    db["matches"].create_index([("winning_team_id", ASCENDING)])

    # ── TELEMETRY EVENTS ─────────────────────────────────────────────────────
    # Colección time-series nativa (MongoDB ≥ 5.0) — optimizada para series
    # temporales de alta cardinalidad. metaField agrupa por partida.
    if "telemetry_events" not in existing:
        db.create_collection(
            "telemetry_events",
            timeseries={
                "timeField": "event_time",
                "metaField": "match_id",
                "granularity": "seconds",
            },
        )

    # Q2: línea de tiempo por partida + ronda
    db["telemetry_events"].create_index(
        [("match_id", ASCENDING), ("round_number", ASCENDING),
         ("event_time", DESCENDING)]
    )
    # Q3: eventos de un jugador en una partida
    db["telemetry_events"].create_index(
        [("actor_id", ASCENDING), ("match_id", ASCENDING),
         ("event_time", ASCENDING)]
    )

    # ── PLAYER MATCH STATS ───────────────────────────────────────────────────
    if "player_match_stats" not in existing:
        db.create_collection(
            "player_match_stats",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["match_id", "player_id", "kills",
                                 "deaths", "assists", "damage_total"],
                    "properties": {
                        "kills":          {"bsonType": "int", "minimum": 0},
                        "deaths":         {"bsonType": "int", "minimum": 0},
                        "assists":        {"bsonType": "int", "minimum": 0},
                        "damage_total":   {"bsonType": "int", "minimum": 0},
                        "headshot_pct":   {"bsonType": "double",
                                           "minimum": 0, "maximum": 1},
                        "kda":            {"bsonType": "double"},
                    },
                }
            },
        )

    # Q5: recuperar stats de un jugador en una partida específica
    db["player_match_stats"].create_index(
        [("match_id", ASCENDING), ("player_id", ASCENDING)], unique=True
    )
    db["player_match_stats"].create_index([("player_id", ASCENDING),
                                            ("kda", DESCENDING)])

    # ── SEASON LEADERBOARD ───────────────────────────────────────────────────
    if "season_leaderboards" not in existing:
        db.create_collection(
            "season_leaderboards",
            validator={
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["season_id", "metric", "player_id", "value"],
                    "properties": {
                        "season_id": {"bsonType": "string"},
                        "metric":    {"bsonType": "string",
                                      "enum": ["kda", "acs", "kills",
                                               "damage", "headshot_pct"]},
                        "value":     {"bsonType": "double"},
                        "position":  {"bsonType": "int", "minimum": 1},
                    },
                }
            },
        )

    # Q6: top-N por temporada + métrica ordenado por valor DESC
    db["season_leaderboards"].create_index(
        [("season_id", ASCENDING), ("metric", ASCENDING),
         ("value", DESCENDING)]
    )

    print("✓ Colecciones e índices creados correctamente.")
