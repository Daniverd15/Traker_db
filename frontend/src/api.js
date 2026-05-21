const BASE = '/api'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  stats:       ()                          => get('/stats'),
  seed:        ()                          => post('/seed', {}),

  players:     ()                          => get('/players'),
  player:      (id)                        => get(`/players/${id}`),

  matches:     (mapa, agente, limit = 20)  => {
    const params = new URLSearchParams()
    if (mapa)   params.set('mapa', mapa)
    if (agente) params.set('agente', agente)
    params.set('limit', limit)
    return get(`/matches?${params}`)
  },
  match:       (id)                        => get(`/matches/${id}`),
  matchStats:  (id)                        => get(`/matches/${id}/stats`),
  timeline:      (matchId, round) => get(`/matches/${matchId}/timeline/${round}`),
  roundsSummary: (matchId)       => get(`/matches/${matchId}/rounds-summary`),

  leaderboard: (seasonId, metric = 'kda', limit = 20) =>
    get(`/leaderboard/${seasonId}?metric=${metric}&limit=${limit}`),

  insertEvent: (body) => post('/telemetry', body),
}
