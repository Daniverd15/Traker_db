"""
Seed sintético a escala real:
  - 8 equipos (NA, EMEA, LATAM, APAC)
  - 40 jugadores (5 por equipo)
  - 10 agentes
  - 20 partidas (mezcla de equipos y mapas)
  - 13-25 rondas por partida con ~90 eventos c/u  →  ~40K eventos totales
  - Stats por jugador en cada partida
  - Leaderboard agregado (KDA, ACS, kills, damage, headshot_pct)
"""
import random
from datetime import datetime, timedelta
from bson import ObjectId
from config.db import get_db

# ── Catálogos ─────────────────────────────────────────────────────────────────

MAPS = ["Ascent", "Bind", "Haven", "Split", "Fracture", "Pearl", "Lotus", "Sunset"]

WIN_CONDITIONS = [
    "eliminacion", "bomba_detonada",
    "bomba_desactivada", "tiempo_agotado",
]

WEAPONS = [
    "Vandal", "Phantom", "Operator", "Sheriff", "Spectre",
    "Odin", "Guardian", "Marshal", "Bucky", "Stinger", "Knife",
]

EVENT_TYPES = ["kill", "damage", "ability", "movement"]

AGENTS_DATA = [
    {"name": "Jett",      "role": "Duelista",    "abilities": ["Updraft", "Tailwind", "Cloudburst", "Blade Storm"]},
    {"name": "Reyna",     "role": "Duelista",    "abilities": ["Leer", "Devour", "Dismiss", "Empress"]},
    {"name": "Neon",      "role": "Duelista",    "abilities": ["Fast Lane", "Relay Bolt", "High Gear", "Overdrive"]},
    {"name": "Sage",      "role": "Centinela",   "abilities": ["Slow Orb", "Healing Orb", "Barrier Orb", "Resurrection"]},
    {"name": "Chamber",   "role": "Centinela",   "abilities": ["Trademark", "Headhunter", "Rendezvous", "Tour De Force"]},
    {"name": "Killjoy",   "role": "Centinela",   "abilities": ["Alarmbot", "Nanoswarm", "Turret", "Lockdown"]},
    {"name": "Omen",      "role": "Controlador", "abilities": ["Shrouded Step", "Paranoia", "Dark Cover", "From the Shadows"]},
    {"name": "Astra",     "role": "Controlador", "abilities": ["Nova Pulse", "Nebula", "Gravity Well", "Cosmic Divide"]},
    {"name": "Sova",      "role": "Iniciador",   "abilities": ["Owl Drone", "Shock Bolt", "Recon Bolt", "Hunter's Fury"]},
    {"name": "Fade",      "role": "Iniciador",   "abilities": ["Prowler", "Seize", "Haunt", "Nightfall"]},
]

AGENT_NAMES = [a["name"] for a in AGENTS_DATA]

# Agentes preferidos por rol (para asignación realista)
ROLE_AGENTS = {
    "Duelista":    ["Jett", "Reyna", "Neon"],
    "Centinela":   ["Sage", "Chamber", "Killjoy"],
    "Controlador": ["Omen", "Astra"],
    "Iniciador":   ["Sova", "Fade"],
}

TEAMS_META = [
    {"name": "Sentinels",    "region": "NA",    "coach": "Syyko"},
    {"name": "NRG Esports",  "region": "NA",    "coach": "FNS"},
    {"name": "NAVI",         "region": "EMEA",  "coach": "B1ad3"},
    {"name": "Team Liquid",  "region": "EMEA",  "coach": "Epex"},
    {"name": "LOUD",         "region": "LATAM", "coach": "bcJ"},
    {"name": "KRÜ Esports",  "region": "LATAM", "coach": "Mazino"},
    {"name": "Paper Rex",    "region": "APAC",  "coach": "alecks"},
    {"name": "DRX",          "region": "APAC",  "coach": "termi"},
]

PLAYERS_BY_TEAM = {
    "Sentinels":   [
        ("TenZ",     "CA", "Duelista",    "Radiante"),
        ("ShahZaM",  "US", "Centinela",   "Inmortal"),
        ("SicK",     "US", "Iniciador",   "Inmortal"),
        ("dapr",     "US", "Centinela",   "Inmortal"),
        ("zombs",    "US", "Controlador", "Inmortal"),
    ],
    "NRG Esports": [
        ("Victor",   "US", "Duelista",    "Radiante"),
        ("ardiis",   "LV", "Duelista",    "Inmortal"),
        ("crashies", "US", "Iniciador",   "Inmortal"),
        ("s0m",      "US", "Controlador", "Radiante"),
        ("eeiu",     "US", "Centinela",   "Inmortal"),
    ],
    "NAVI":        [
        ("cNed",     "HU", "Duelista",    "Radiante"),
        ("ANGE1",    "UA", "Controlador", "Radiante"),
        ("Shao",     "KZ", "Iniciador",   "Inmortal"),
        ("SUYGETSU", "RU", "Duelista",    "Inmortal"),
        ("Zyppan",   "SE", "Centinela",   "Inmortal"),
    ],
    "Team Liquid": [
        ("nAts",     "RU", "Centinela",   "Radiante"),
        ("Jamppi",   "FI", "Duelista",    "Radiante"),
        ("Lawliet",  "ES", "Controlador", "Inmortal"),
        ("Destrian", "SE", "Iniciador",   "Inmortal"),
        ("soulcas",  "GB", "Iniciador",   "Inmortal"),
    ],
    "LOUD":        [
        ("aspas",    "BR", "Duelista",    "Radiante"),
        ("Less",     "BR", "Iniciador",   "Radiante"),
        ("saadhak",  "AR", "Controlador", "Inmortal"),
        ("Tuyz",     "BR", "Centinela",   "Inmortal"),
        ("cauanzin", "BR", "Duelista",    "Inmortal"),
    ],
    "KRÜ Esports": [
        ("keznit",   "AR", "Duelista",    "Radiante"),
        ("Klaus",    "AR", "Controlador", "Inmortal"),
        ("NagZ",     "CL", "Centinela",   "Inmortal"),
        ("delz1k",   "CL", "Duelista",    "Inmortal"),
        ("Melser",   "AR", "Iniciador",   "Inmortal"),
    ],
    "Paper Rex":   [
        ("Jinggg",      "SG", "Duelista",    "Radiante"),
        ("f0rsakeN",    "SG", "Duelista",    "Inmortal"),
        ("mindfreak",   "AU", "Controlador", "Radiante"),
        ("d4v41",       "SG", "Iniciador",   "Inmortal"),
        ("something",   "MY", "Controlador", "Inmortal"),
    ],
    "DRX":         [
        ("Rb",    "KR", "Duelista",    "Radiante"),
        ("stax",  "KR", "Controlador", "Radiante"),
        ("Zest",  "KR", "Iniciador",   "Inmortal"),
        ("BuZz",  "KR", "Centinela",   "Inmortal"),
        ("MaKo",  "KR", "Controlador", "Inmortal"),
    ],
}

# Multiplicadores de rendimiento por rol (kills, damage, hs_pct)
ROLE_PERF = {
    "Duelista":    {"k": 1.30, "dmg": 1.25, "hs": 1.20},
    "Centinela":   {"k": 0.85, "dmg": 0.90, "hs": 0.95},
    "Controlador": {"k": 0.90, "dmg": 0.95, "hs": 0.90},
    "Iniciador":   {"k": 1.00, "dmg": 1.00, "hs": 1.00},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _kda(k, d, a):
    return round((k + a * 0.5) / max(d, 1), 2)

def _rand_pos():
    return {"x": round(random.uniform(0, 512), 1),
            "y": round(random.uniform(0, 512), 1)}

def _player_stats_for_match(role: str, num_rounds: int) -> dict:
    """Genera stats sintéticos realistas según el rol del jugador."""
    m = ROLE_PERF[role]
    base_k_per_round = random.uniform(0.6, 1.4)
    kills   = max(0, int(base_k_per_round * m["k"] * num_rounds + random.gauss(0, 2)))
    deaths  = max(1, int(random.uniform(0.5, 1.1) * num_rounds + random.gauss(0, 2)))
    assists = max(0, int(random.uniform(0.2, 0.7) * num_rounds + random.gauss(0, 1)))
    dmg     = max(300, int(kills * random.randint(140, 175) + assists * 40
                           + random.gauss(0, 200)))
    hs_pct  = round(min(0.65, max(0.08,
                  random.gauss(0.28 * m["hs"], 0.08))), 3)
    return {
        "kills":  kills,
        "deaths": deaths,
        "assists": assists,
        "damage_total": dmg,
        "headshot_pct": hs_pct,
        "kda":    _kda(kills, deaths, assists),
        "acs":    round(dmg / num_rounds, 1),
    }


def _generate_round_events(
    match_id: ObjectId,
    round_number: int,
    all_player_ids: list,
    team_a_ids: list,
    t_start: datetime,
) -> tuple[list, datetime]:
    """
    Genera ~90 eventos para una ronda. Devuelve (lista_docs, timestamp_final).
    """
    docs = []
    t = t_start

    # Kills: 8-13 por ronda (los 10 jugadores pelean hasta que alguien gana)
    num_kills = random.randint(8, 13)
    killed = random.sample(all_player_ids, min(num_kills, len(all_player_ids)))

    for victim_id in killed:
        killer_id = random.choice([p for p in all_player_ids if p != victim_id])
        t += timedelta(seconds=random.uniform(2, 15))
        docs.append({
            "match_id":    match_id,
            "round_number": round_number,
            "event_time":  t,
            "event_type":  "kill",
            "actor_id":    killer_id,
            "target_id":   victim_id,
            "weapon":      random.choice(WEAPONS[:6]),
            "position":    _rand_pos(),
            "damage":      150,
            "headshot":    random.random() < 0.30,
        })

    # Damage: ~40-55 eventos
    for _ in range(random.randint(40, 55)):
        actor = random.choice(all_player_ids)
        target = random.choice([p for p in all_player_ids if p != actor])
        t += timedelta(seconds=random.uniform(0.1, 3))
        docs.append({
            "match_id":    match_id,
            "round_number": round_number,
            "event_time":  t,
            "event_type":  "damage",
            "actor_id":    actor,
            "target_id":   target,
            "weapon":      random.choice(WEAPONS),
            "position":    _rand_pos(),
            "damage":      random.randint(10, 140),
            "headshot":    False,
        })

    # Abilities: ~20-25 eventos
    for _ in range(random.randint(20, 25)):
        t += timedelta(seconds=random.uniform(0.5, 4))
        docs.append({
            "match_id":    match_id,
            "round_number": round_number,
            "event_time":  t,
            "event_type":  "ability",
            "actor_id":    random.choice(all_player_ids),
            "position":    _rand_pos(),
            "weapon":      "",
            "damage":      0,
            "headshot":    False,
        })

    # Movement: ~10-15 eventos
    for _ in range(random.randint(10, 15)):
        t += timedelta(seconds=random.uniform(0.2, 2))
        docs.append({
            "match_id":    match_id,
            "round_number": round_number,
            "event_time":  t,
            "event_type":  "movement",
            "actor_id":    random.choice(all_player_ids),
            "position":    _rand_pos(),
            "weapon":      "",
            "damage":      0,
            "headshot":    False,
        })

    return docs, t


# ── Seeder principal ──────────────────────────────────────────────────────────

def seed():
    db = get_db()

    print("  Limpiando colecciones existentes...")
    for col in ["players", "teams", "agents", "matches",
                "telemetry_events", "player_match_stats", "season_leaderboards"]:
        db[col].drop()

    from schema.collections import setup_collections
    setup_collections(db)

    season_id = "T2024_S1"

    # ── Agentes ──────────────────────────────────────────────────────────────
    db["agents"].insert_many(AGENTS_DATA)
    print(f"  Agentes:   {len(AGENTS_DATA)}")

    # ── Equipos y jugadores ───────────────────────────────────────────────────
    team_id_map: dict[str, ObjectId] = {}    # nombre → _id
    player_id_map: dict[str, ObjectId] = {}  # nickname → _id
    player_role_map: dict[str, str] = {}     # _id_str → role

    for team_meta in TEAMS_META:
        tname = team_meta["name"]
        team_doc = {**team_meta, "season_id": season_id, "player_ids": []}
        t_id = db["teams"].insert_one(team_doc).inserted_id
        team_id_map[tname] = t_id

        pids = []
        for nick, country, role, rank in PLAYERS_BY_TEAM[tname]:
            p_id = db["players"].insert_one({
                "nickname": nick, "country": country,
                "role": role, "rank": rank, "team_id": t_id,
            }).inserted_id
            pids.append(p_id)
            player_id_map[nick] = p_id
            player_role_map[str(p_id)] = role

        db["teams"].update_one({"_id": t_id}, {"$set": {"player_ids": pids}})

    print(f"  Equipos:   {len(TEAMS_META)}")
    print(f"  Jugadores: {sum(len(v) for v in PLAYERS_BY_TEAM.values())}")

    # ── Generar 20 partidas ───────────────────────────────────────────────────
    team_names = list(TEAMS_META)
    match_date = datetime(2024, 3, 1, 18, 0, 0)   # inicio de temporada
    all_match_stats = []   # acumulado para leaderboard

    for match_idx in range(20):
        # Elegir 2 equipos distintos aleatoriamente
        t_a_meta, t_b_meta = random.sample(TEAMS_META, 2)
        t_a_name, t_b_name = t_a_meta["name"], t_b_meta["name"]
        t_a_id = team_id_map[t_a_name]
        t_b_id = team_id_map[t_b_name]

        pids_a = [player_id_map[n] for n, *_ in PLAYERS_BY_TEAM[t_a_name]]
        pids_b = [player_id_map[n] for n, *_ in PLAYERS_BY_TEAM[t_b_name]]
        all_pids = pids_a + pids_b

        # Asignar agentes según rol
        def pick_agent(pid):
            role = player_role_map[str(pid)]
            pool = ROLE_AGENTS.get(role, AGENT_NAMES)
            return random.choice(pool)

        player_agents = [{"player_id": pid, "agent": pick_agent(pid)} for pid in all_pids]

        # Rondas: sistema best-of-25 (primero en 13 gana)
        wins_a = wins_b = 0
        rounds = []
        round_number = 1
        match_start = match_date
        t = match_start + timedelta(seconds=30)

        match_telemetry = []    # todos los eventos de esta partida

        while wins_a < 13 and wins_b < 13:
            winner_id = t_a_id if random.random() > 0.48 else t_b_id
            if winner_id == t_a_id:
                wins_a += 1
            else:
                wins_b += 1

            rounds.append({
                "round_number":  round_number,
                "winning_team_id": winner_id,
                "win_condition": random.choice(WIN_CONDITIONS),
                "economy": {
                    "team_a_spent": random.randint(3000, 27000),
                    "team_b_spent": random.randint(3000, 27000),
                },
            })

            evts, t = _generate_round_events(
                ObjectId(), round_number, all_pids, pids_a, t
            )
            match_telemetry.extend(evts)
            t += timedelta(seconds=random.randint(20, 45))   # pausa entre rondas
            round_number += 1

        num_rounds = len(rounds)
        match_winner = t_a_id if wins_a > wins_b else t_b_id
        match_end = t + timedelta(minutes=random.randint(2, 8))

        chosen_map = random.choice(MAPS)
        match_id = db["matches"].insert_one({
            "map":            chosen_map,
            "start_time":     match_start,
            "end_time":       match_end,
            "match_type":     random.choice(["torneo", "competitivo", "scrim"]),
            "winning_team_id": match_winner,
            "teams": [
                {"team_id": t_a_id, "side": "atacante"},
                {"team_id": t_b_id, "side": "defensor"},
            ],
            "player_agents": player_agents,
            "rounds":        rounds,
        }).inserted_id

        # ── Parchear match_id real en los eventos ──────────────────────────
        for ev in match_telemetry:
            ev["match_id"] = match_id

        db["telemetry_events"].insert_many(match_telemetry)

        # ── Stats por jugador ─────────────────────────────────────────────
        agent_map = {pa["player_id"]: pa["agent"] for pa in player_agents}
        for pid in all_pids:
            role  = player_role_map[str(pid)]
            s     = _player_stats_for_match(role, num_rounds)
            stat_doc = {
                "match_id":      match_id,
                "player_id":     pid,
                "agent":         agent_map.get(pid, "Jett"),
                "kills":         s["kills"],
                "deaths":        s["deaths"],
                "assists":       s["assists"],
                "damage_total":  s["damage_total"],
                "headshot_pct":  s["headshot_pct"],
                "kda":           s["kda"],
                "acs":           s["acs"],
                "created_at":    match_end,
            }
            db["player_match_stats"].insert_one(stat_doc)
            all_match_stats.append({**stat_doc, "_player_id": pid})

        match_date += timedelta(days=random.randint(3, 9))
        pct = int((match_idx + 1) / 20 * 100)
        print(f"  Partida {match_idx+1:2}/20  {chosen_map:10}  "
              f"{t_a_name:12} vs {t_b_name:12}  "
              f"({wins_a}-{wins_b})  {len(match_telemetry):4} eventos  [{pct:3}%]")

    # ── Leaderboard agregado ──────────────────────────────────────────────────
    print("\n  Calculando leaderboard de temporada...")
    # kills y damage se redondean a entero al almacenar
    metrics_pipeline = {
        "kda":          ({"$avg": "$kda"},          lambda v: round(v, 2)),
        "acs":          ({"$avg": "$acs"},          lambda v: round(v, 1)),
        "kills":        ({"$avg": "$kills"},        lambda v: round(v)),
        "damage":       ({"$avg": "$damage_total"}, lambda v: round(v)),
        "headshot_pct": ({"$avg": "$headshot_pct"}, lambda v: round(v, 3)),
    }

    lb_docs = []
    for metric, (agg_expr, rounder) in metrics_pipeline.items():
        aggregated = list(db["player_match_stats"].aggregate([
            {"$group": {"_id": "$player_id", "value": agg_expr}},
            {"$sort":  {"value": -1}},
        ]))
        for pos, row in enumerate(aggregated, start=1):
            lb_docs.append({
                "season_id":  season_id,
                "metric":     metric,
                "player_id":  row["_id"],
                "value":      float(rounder(float(row["value"]))),
                "position":   pos,
                "updated_at": datetime.utcnow(),
            })

    db["season_leaderboards"].insert_many(lb_docs)
    print(f"  Leaderboard: {len(lb_docs)} entradas ({len(metrics_pipeline)} métricas × jugadores)")

    # ── Resumen final ─────────────────────────────────────────────────────────
    total_events = db["telemetry_events"].count_documents({})
    total_stats  = db["player_match_stats"].count_documents({})
    print("\n" + "═" * 55)
    print(f"  Equipos:          {db['teams'].count_documents({})}")
    print(f"  Jugadores:        {db['players'].count_documents({})}")
    print(f"  Agentes:          {db['agents'].count_documents({})}")
    print(f"  Partidas:         {db['matches'].count_documents({})}")
    print(f"  Eventos telemetría: {total_events:,}")
    print(f"  Stats jugador:    {total_stats}")
    print(f"  Leaderboard:      {db['season_leaderboards'].count_documents({})}")
    print("═" * 55)
    print("  ✓ Seed completado")

    return {
        "season_id": season_id,
        "team_ids":  team_id_map,
        "player_ids": player_id_map,
    }


if __name__ == "__main__":
    seed()
