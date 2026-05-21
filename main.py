"""
Demo CLI: ejecuta seed y muestra las 6 consultas del proyecto.
"""
from config.db import get_db
from seed.seed_data import seed
from queries.telemetry import linea_de_tiempo_ronda, eventos_jugador_partida
from queries.matches import partidas_por_mapa_agente
from queries.stats import top_jugadores_partida
from queries.leaderboard import leaderboard_con_nicknames


def sep(titulo):
    print(f"\n{'─'*62}")
    print(f"  {titulo}")
    print("─" * 62)


def main():
    print("=== Valorant Performance Tracker — Demo CLI ===\n")

    print("[ Poblando base de datos con datos sintéticos... ]")
    ids = seed()
    db  = get_db()

    season_id = ids["season_id"]

    # Obtener primera partida y primer jugador desde la DB
    first_match  = db["matches"].find_one({}, sort=[("start_time", 1)])
    match_id     = first_match["_id"]
    first_player = first_match["player_agents"][0]["player_id"]

    sep("Q1 — Insertar evento de telemetría en tiempo real")
    from queries.telemetry import insertar_evento
    eid = insertar_evento(
        db, match_id=match_id, round_number=3,
        event_type="kill", actor_id=first_player,
        weapon="Vandal", damage=150, headshot=True,
    )
    print(f"  Evento insertado  _id: {eid}")

    sep("Q2 — Línea de tiempo de la ronda 1")
    eventos = linea_de_tiempo_ronda(db, match_id, round_number=1, limit=8)
    print(f"  Primeros 8 eventos:")
    for e in eventos:
        ts = e["event_time"].strftime("%H:%M:%S")
        print(f"    [{ts}] {e['event_type']:10} dmg={e['damage']:4}  hs={e['headshot']}")

    sep(f"Q3 — Eventos del jugador {first_player} en la partida")
    ev_j = eventos_jugador_partida(db, first_player, match_id, limit=10)
    print(f"  Eventos encontrados: {len(ev_j)}")
    for e in ev_j[:5]:
        print(f"    Ronda {e['round_number']}  {e['event_type']:10} {e.get('weapon','')}")

    sep("Q4 — Partidas en Ascent donde se jugó Jett")
    partidas = partidas_por_mapa_agente(db, mapa="Ascent", agente="Jett", limit=5)
    print(f"  Partidas encontradas: {len(partidas)}")
    for p in partidas:
        ts = p["start_time"].strftime("%Y-%m-%d")
        print(f"    {ts}  {p['map']}")

    sep("Q5 — Top 5 jugadores de la partida por KDA")
    top = top_jugadores_partida(db, match_id, metrica="kda", limit=5)
    print("  Pos  KDA    K    D    A   Agente")
    for i, s in enumerate(top, 1):
        print(f"   {i}.  {s['kda']:.2f}  {s['kills']:3}  {s['deaths']:3}  "
              f"{s['assists']:3}  {s['agent']}")

    sep(f"Q6 — Top 10 KDA Temporada {season_id}")
    lb = leaderboard_con_nicknames(db, season_id, metrica="kda", limit=10)
    print("  Pos  Nickname        País   Rango        KDA")
    print("  " + "-" * 50)
    for row in lb:
        print(f"  {row['position']:3}.  {row['nickname']:15} {row['country']:6} "
              f"{row['rank']:12} {row['value']:.2f}")

    print("\n=== Demo completada ===")


if __name__ == "__main__":
    main()
