# Valorant Performance Tracker (VPT)

Base de datos NoSQL orientada a e-sports competitivo (Valorant) con API REST y dashboard web para visualizar estadísticas de partidas en tiempo real.

---

## Descripción

VPT es un sistema de telemetría y análisis de rendimiento para Valorant que captura eventos de partida, almacena estadísticas por jugador y genera leaderboards de temporada. Diseñado para demostrar el uso de MongoDB como base de datos NoSQL en un escenario de alta concurrencia e ingestión masiva de datos.

### Características principales

- Captura de eventos de telemetría en tiempo real (kills, daño, habilidades, movimiento)
- Estadísticas por jugador y por partida (K/D/A, ACS, HS%, daño)
- Rankings y leaderboards por temporada con múltiples métricas
- Filtrado de partidas por mapa y agente
- Timeline de kills por ronda con nombres de jugadores resueltos
- Dashboard con visualizaciones interactivas (Recharts)
- Seed de datos sintéticos: 8 equipos, 40 jugadores, 20 partidas, ~40 000 eventos

---

## Stack tecnológico

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Base de datos | MongoDB Community (local)        |
| Backend    | Python 3.10+ · FastAPI · PyMongo    |
| Frontend   | React 18 · Vite · React Router v6  |
| Gráficas   | Recharts                            |

---

## Arquitectura

```
                     ┌─────────────────────┐
                     │   React + Vite      │  localhost:5173
                     │   (Frontend)        │
                     └────────┬────────────┘
                              │ fetch /api/*
                     ┌────────▼────────────┐
                     │   FastAPI           │  localhost:8000
                     │   (Backend REST)    │
                     └────────┬────────────┘
                              │ PyMongo
                     ┌────────▼────────────┐
                     │   MongoDB           │  localhost:27017
                     │   valorant_tracker  │
                     └─────────────────────┘
```

---

## Modelo de datos

### Colecciones

| Colección             | Descripción                                              | Tipo           |
|-----------------------|----------------------------------------------------------|----------------|
| `players`             | Jugadores con rol, rango y equipo                        | Document       |
| `teams`               | Equipos por región y temporada                           | Document       |
| `agents`              | Agentes del juego con habilidades                        | Document       |
| `matches`             | Partidas con rondas embebidas (≤ 25 por partida)         | Document       |
| `telemetry_events`    | Eventos de combate en tiempo real                        | **Time-Series**|
| `player_match_stats`  | Estadísticas agregadas por jugador por partida           | Document       |
| `season_leaderboards` | Rankings por métrica y temporada                         | Document       |

### Relaciones clave

```
Team ──── Player (1:N)
Match ─── Team × 2  (N:M)
Match ─── Round (embebido, 1:N)
Round ─── TelemetryEvent (1:N  →  colección separada)
Player ── PlayerMatchStats (1:N)
Player ── SeasonLeaderboard (1:N)
```

### Decisiones de diseño

- **Rounds embebidos en Match** — acotados a ≤ 25, acceso siempre junto a la partida.
- **TelemetryEvents como Time-Series nativa** — optimizada para ingestión masiva; `metaField = match_id`, `timeField = event_time`.
- **Tablas por patrón de consulta** — cada endpoint tiene su índice compuesto dedicado.

---

## Teorema CAP

MongoDB opera como sistema **CP** (Consistencia + Tolerancia al Particionado) con réplicas. Para la ingestión de telemetría en vivo se puede relajar el write concern (`w:1`) y usar `readPreference: secondaryPreferred` para queries analíticas, logrando un comportamiento **AP** en esas rutas sin sacrificar la consistencia de los agregados finales.

---

## Consultas principales

| # | Tipo        | Descripción                                              |
|---|-------------|----------------------------------------------------------|
| Q1 | INSERT     | Guardar evento de telemetría en tiempo real              |
| Q2 | SELECT     | Línea de tiempo de kills de una ronda (con nicknames)    |
| Q3 | SELECT     | Todos los eventos de un jugador en una partida           |
| Q4 | FILTER     | Partidas por mapa y agente                               |
| Q5 | UPSERT     | Guardar / actualizar estadísticas K/D/A al cerrar partida|
| Q6 | RANKING    | Top-N jugadores por métrica en la temporada (+ $lookup)  |

---

## Estructura del proyecto

```
Traker_db/
├── app.py                      # FastAPI — punto de entrada del backend
├── main.py                     # Demo CLI de las 6 consultas
├── requirements.txt
│
├── config/
│   └── db.py                   # Conexión a MongoDB
│
├── schema/
│   ├── collections.py          # Creación de colecciones + validadores + índices
│   └── models.py               # Dataclasses por entidad
│
├── seed/
│   └── seed_data.py            # Generador de datos sintéticos (8 equipos, 20 partidas)
│
├── queries/
│   ├── telemetry.py            # Q1, Q2, Q3
│   ├── matches.py              # Q4
│   ├── stats.py                # Q5
│   └── leaderboard.py         # Q6
│
├── routers/                    # Endpoints FastAPI
│   ├── players.py
│   ├── matches.py
│   ├── leaderboard.py
│   └── telemetry.py
│
├── utils/
│   └── serializer.py           # ObjectId / datetime → JSON
│
└── frontend/                   # React + Vite
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── api.js              # Capa de llamadas al backend
        ├── index.css           # Tema oscuro estilo Valorant
        ├── components/
        │   └── Navbar.jsx
        └── pages/
            ├── Dashboard.jsx   # Resumen + top KDA chart
            ├── Leaderboard.jsx # Rankings con gráfico de barras
            ├── Matches.jsx     # Listado con filtros Q4
            ├── MatchDetail.jsx # Marcador + stats por equipo + timeline
            └── Players.jsx     # Tabla de jugadores
```

---

## Instalación y ejecución

### Requisitos previos

- Python 3.10+
- Node.js 18+
- MongoDB Community Server 6.0+ corriendo en `localhost:27017`

### 1. Clonar el repositorio

```bash
git clone https://github.com/<tu-usuario>/Traker_db.git
cd Traker_db
```

### 2. Backend

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

La API queda disponible en `http://localhost:8000`.  
Documentación interactiva (Swagger): `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación web queda en `http://localhost:5173`.

### 4. Poblar la base de datos

Una vez levantados ambos servidores, abre el navegador en `http://localhost:5173` y pulsa el botón **Seed DB** en la barra de navegación.

Alternativamente, desde la terminal:

```bash
python main.py
```

---

## API endpoints

| Método | Ruta                                      | Descripción                           |
|--------|-------------------------------------------|---------------------------------------|
| GET    | `/api/health`                             | Estado del servidor                   |
| GET    | `/api/stats`                              | Conteo global de entidades            |
| POST   | `/api/seed`                               | Repoblar BD con datos sintéticos      |
| GET    | `/api/players`                            | Listar jugadores con equipo           |
| GET    | `/api/players/{id}`                       | Detalle + historial de stats          |
| GET    | `/api/matches`                            | Listar partidas (filtros: mapa, agente)|
| GET    | `/api/matches/{id}`                       | Detalle de partida + marcador         |
| GET    | `/api/matches/{id}/stats`                 | Stats por equipo (Q5)                 |
| GET    | `/api/matches/{id}/rounds-summary`        | Kills por ronda (gráfico timeline)    |
| GET    | `/api/matches/{id}/timeline/{round}`      | Kills de la ronda con nicknames (Q2)  |
| GET    | `/api/leaderboard/{season_id}`            | Top-N por métrica (Q6)                |
| POST   | `/api/telemetry`                          | Insertar evento en tiempo real (Q1)   |

---

## Conexión a MongoDB

Editar `config/db.py` según el entorno:

```python
# Local sin autenticación (por defecto)
MONGO_URI = "mongodb://localhost:27017"

# Local con usuario/contraseña
MONGO_URI = "mongodb://admin:password@localhost:27017/valorant_tracker?authSource=admin"

# MongoDB Atlas (cloud)
MONGO_URI = "mongodb+srv://usuario:password@cluster.mongodb.net/valorant_tracker"
```

---

## Escala de datos sintéticos generados

| Entidad            | Cantidad        |
|--------------------|-----------------|
| Equipos            | 8 (NA, EMEA, LATAM, APAC) |
| Jugadores          | 40 (5 por equipo)         |
| Agentes            | 10              |
| Partidas           | 20              |
| Rondas totales     | ~380            |
| Eventos telemetría | ~40 000         |
| Stats jugador      | 200             |
| Leaderboard        | 200 entradas (40 jugadores × 5 métricas) |

---

## Licencia

MIT
