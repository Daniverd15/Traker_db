"""
Estructuras de datos que representan los documentos de cada colección.
Usadas como contratos entre capas (seed, queries, aplicación).
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from bson import ObjectId


@dataclass
class Player:
    nickname: str
    country: str
    role: str          # Duelista | Centinela | Controlador | Iniciador
    rank: str          # Radiant | Immortal | Diamond …
    team_id: Optional[ObjectId] = None
    _id: ObjectId = field(default_factory=ObjectId)


@dataclass
class Team:
    name: str
    region: str        # NA | EMEA | LATAM | APAC | BR
    season_id: str
    coach: str = ""
    player_ids: list = field(default_factory=list)
    _id: ObjectId = field(default_factory=ObjectId)


@dataclass
class Agent:
    name: str
    role: str          # Duelista | Centinela | Controlador | Iniciador
    abilities: list = field(default_factory=list)
    _id: ObjectId = field(default_factory=ObjectId)


@dataclass
class Round:
    round_number: int
    win_condition: str  # eliminacion | bomba_detonada | bomba_desactivada | tiempo_agotado
    winning_team_id: Optional[ObjectId] = None
    economy: dict = field(default_factory=dict)


@dataclass
class PlayerAgent:
    player_id: ObjectId
    agent: str


@dataclass
class Match:
    map: str
    start_time: datetime
    match_type: str     # competitivo | torneo | scrim | entrenamiento
    teams: list         # [{"team_id": ObjectId, "side": str}]
    player_agents: list # [{"player_id": ObjectId, "agent": str}]
    rounds: list = field(default_factory=list)
    end_time: Optional[datetime] = None
    winning_team_id: Optional[ObjectId] = None
    _id: ObjectId = field(default_factory=ObjectId)


@dataclass
class TelemetryEvent:
    match_id: ObjectId        # metaField para agrupación time-series
    round_number: int
    event_time: datetime      # timeField
    event_type: str           # kill | damage | ability | movement | buy
    actor_id: ObjectId
    weapon: str = ""
    target_id: Optional[ObjectId] = None
    position: dict = field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    damage: int = 0
    headshot: bool = False


@dataclass
class PlayerMatchStats:
    match_id: ObjectId
    player_id: ObjectId
    agent: str
    kills: int
    deaths: int
    assists: int
    damage_total: int
    headshot_pct: float = 0.0
    kda: float = 0.0
    acs: float = 0.0           # Average Combat Score
    created_at: datetime = field(default_factory=datetime.utcnow)
    _id: ObjectId = field(default_factory=ObjectId)


@dataclass
class SeasonLeaderboard:
    season_id: str
    metric: str                # kda | acs | kills | damage | headshot_pct
    player_id: ObjectId
    value: float
    position: int
    updated_at: datetime = field(default_factory=datetime.utcnow)
    _id: ObjectId = field(default_factory=ObjectId)
