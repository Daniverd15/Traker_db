from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from config.db import get_db
from routers import players, matches, leaderboard, telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = get_db()
    yield


app = FastAPI(
    title="Valorant Performance Tracker API",
    version="1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router,    prefix="/api/players",     tags=["Players"])
app.include_router(matches.router,    prefix="/api/matches",     tags=["Matches"])
app.include_router(leaderboard.router,prefix="/api/leaderboard", tags=["Leaderboard"])
app.include_router(telemetry.router,  prefix="/api/telemetry",   tags=["Telemetry"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def summary_stats(request: Request):
    db = request.app.state.db
    return {
        "players": db["players"].count_documents({}),
        "matches": db["matches"].count_documents({}),
        "teams":   db["teams"].count_documents({}),
        "events":  db["telemetry_events"].count_documents({}),
    }


@app.post("/api/seed")
def run_seed(request: Request):
    """Repuebla la base de datos con datos sintéticos a escala completa."""
    from seed.seed_data import seed
    result = seed()
    db = request.app.state.db
    return {
        "message":  "Seed completado",
        "season_id": result["season_id"],
        "teams":    db["teams"].count_documents({}),
        "players":  db["players"].count_documents({}),
        "matches":  db["matches"].count_documents({}),
        "events":   db["telemetry_events"].count_documents({}),
    }
