import { useEffect, useState } from 'react'
import { api } from '../api'

// ── Constantes de formulario ──────────────────────────────────────────────────

const MAPS    = ['Ascent','Bind','Haven','Split','Fracture','Pearl','Lotus','Sunset']
const AGENTS  = ['Jett','Reyna','Neon','Sage','Chamber','Killjoy','Omen','Astra','Sova','Fade']
const WEAPONS = ['Vandal','Phantom','Operator','Sheriff','Spectre','Odin','Guardian','Marshal']
const E_TYPES = ['kill','damage','ability','movement']
const METRICS = ['kda','acs','kills','damage','headshot_pct']

// ── Helpers de display ────────────────────────────────────────────────────────

function CodeBlock({ code }) {
  return (
    <pre style={{
      background: '#0a1118',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '14px 18px',
      fontSize: 12,
      lineHeight: 1.7,
      overflowX: 'auto',
      color: '#a8d8a0',
      fontFamily: "'Fira Code', 'Courier New', monospace",
      margin: 0,
    }}>
      <code>{code}</code>
    </pre>
  )
}

function ResultView({ result }) {
  if (!result) return null

  const items = Array.isArray(result) ? result : [result]
  if (!items.length) {
    return <p style={{ color: 'var(--muted)', padding: '12px 0' }}>Sin resultados.</p>
  }

  // Si es mensaje de éxito (insert)
  if (items[0]?.event_id || items[0]?.message) {
    return (
      <div style={{
        background: 'rgba(0,200,123,0.1)', border: '1px solid rgba(0,200,123,0.3)',
        borderRadius: 6, padding: '12px 16px', color: 'var(--green)',
        fontFamily: 'Rajdhani', fontWeight: 600, fontSize: 14,
      }}>
        Operación exitosa — {JSON.stringify(items[0])}
      </div>
    )
  }

  // Auto-detectar columnas
  const cols = Object.keys(items[0]).filter(k =>
    typeof items[0][k] !== 'object' || items[0][k] === null
  )

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
        {items.length} resultado{items.length !== 1 ? 's' : ''}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i}>
                {cols.map(c => (
                  <td key={c} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row[c] === null ? <span className="td-muted">null</span>
                      : row[c] === true  ? <span className="td-highlight">true</span>
                      : row[c] === false ? <span className="td-muted">false</span>
                      : typeof row[c] === 'number' ? <span className="td-green">{row[c]}</span>
                      : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Definición de las 6 queries ───────────────────────────────────────────────

function useQueryDefs(matches, players) {
  const matchOpts = matches.map(m => ({ value: m._id, label: `${m.map} — ${new Date(m.start_time).toLocaleDateString('es')}` }))
  const playerOpts = players.map(p => ({ value: p._id, label: p.nickname }))

  return [
    {
      id: 'Q1', badge: 'INSERT',
      title: 'Guardar evento de telemetría',
      desc:  'Registra una acción del juego (kill, daño, habilidad) en tiempo real en la colección time-series.',
      fields: [
        { key: 'match_id',     label: 'Partida',       type: 'select', opts: matchOpts },
        { key: 'round_number', label: 'Ronda',         type: 'number', default: 1 },
        { key: 'event_type',   label: 'Tipo de evento',type: 'select', opts: E_TYPES.map(e => ({ value: e, label: e })) },
        { key: 'actor_id',     label: 'Actor (killer)',type: 'select', opts: playerOpts },
        { key: 'target_id',    label: 'Víctima',       type: 'select', opts: playerOpts },
        { key: 'weapon',       label: 'Arma',          type: 'select', opts: WEAPONS.map(w => ({ value: w, label: w })) },
        { key: 'damage',       label: 'Daño',          type: 'number', default: 150 },
        { key: 'headshot',     label: 'Headshot',      type: 'checkbox' },
      ],
      mongoCode: (v) =>
`db.telemetry_events.insert_one({
    "match_id":     ObjectId("${v.match_id || '<match_id>'}"),
    "round_number": ${v.round_number || 1},
    "event_time":   datetime.utcnow(),   # timeField
    "event_type":   "${v.event_type || 'kill'}",
    "actor_id":     ObjectId("${v.actor_id || '<actor_id>'}"),
    "target_id":    ObjectId("${v.target_id || '<target_id>'}"),
    "weapon":       "${v.weapon || 'Vandal'}",
    "damage":       ${v.damage || 150},
    "headshot":     ${v.headshot ? 'True' : 'False'},
    "position":     {"x": 0.0, "y": 0.0}
})`,
      run: async (v) => api.insertEvent({
        match_id:     v.match_id,
        round_number: Number(v.round_number),
        event_type:   v.event_type,
        actor_id:     v.actor_id,
        target_id:    v.target_id || undefined,
        weapon:       v.weapon,
        damage:       Number(v.damage),
        headshot:     Boolean(v.headshot),
      }),
    },
    {
      id: 'Q2', badge: 'SELECT',
      title: 'Línea de tiempo de kills de una ronda',
      desc:  'Obtiene todos los kill events de una ronda específica, con nombres de asesino y víctima resueltos.',
      fields: [
        { key: 'match_id',     label: 'Partida', type: 'select', opts: matchOpts },
        { key: 'round_number', label: 'Ronda',   type: 'number', default: 1 },
      ],
      mongoCode: (v) =>
`db.telemetry_events.find(
    {
        "match_id":     ObjectId("${v.match_id || '<match_id>'}"),
        "round_number": ${v.round_number || 1},
        "event_type":   "kill"            # solo kills
    },
    sort=[("event_time", ASCENDING)]
)
# + resolución actor_id / target_id → nickname`,
      run: async (v) => api.timeline(v.match_id, Number(v.round_number)),
    },
    {
      id: 'Q3', badge: 'SELECT',
      title: 'Eventos de un jugador en una partida',
      desc:  'Todas las acciones de un jugador en una partida concreta, ordenadas por tiempo.',
      fields: [
        { key: 'player_id', label: 'Jugador', type: 'select', opts: playerOpts },
        { key: 'match_id',  label: 'Partida', type: 'select', opts: matchOpts },
        { key: 'limit',     label: 'Límite',  type: 'number', default: 50 },
      ],
      mongoCode: (v) =>
`db.telemetry_events.find(
    {
        "actor_id": ObjectId("${v.player_id || '<player_id>'}"),
        "match_id": ObjectId("${v.match_id  || '<match_id>'}"),
    },
    sort=[("event_time", ASCENDING)]
).limit(${v.limit || 50})`,
      run: async (v) => {
        const params = new URLSearchParams({ limit: v.limit || 50 })
        const res = await fetch(`/api/matches/${v.match_id}/timeline-player?player_id=${v.player_id}&${params}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      },
    },
    {
      id: 'Q4', badge: 'FILTER',
      title: 'Partidas por mapa y agente',
      desc:  'Filtra partidas donde se haya jugado un agente concreto en un mapa específico.',
      fields: [
        { key: 'mapa',   label: 'Mapa',   type: 'select', opts: ['', ...MAPS].map(m => ({ value: m, label: m || 'Todos' })) },
        { key: 'agente', label: 'Agente', type: 'select', opts: ['', ...AGENTS].map(a => ({ value: a, label: a || 'Todos' })) },
        { key: 'limit',  label: 'Límite', type: 'number', default: 10 },
      ],
      mongoCode: (v) =>
`db.matches.find(
    {
        ${v.mapa   ? `"map":                  "${v.mapa}",` : '# sin filtro de mapa'}
        ${v.agente ? `"player_agents.agent":  "${v.agente}"` : '# sin filtro de agente'}
    }
).sort("start_time", DESCENDING).limit(${v.limit || 10})`,
      run: async (v) => api.matches(v.mapa || null, v.agente || null, Number(v.limit) || 10),
    },
    {
      id: 'Q5', badge: 'SELECT',
      title: 'Estadísticas de jugador en partida',
      desc:  'Recupera el resumen K/D/A, ACS y daño de un jugador en una partida concreta.',
      fields: [
        { key: 'match_id',  label: 'Partida', type: 'select', opts: matchOpts },
        { key: 'player_id', label: 'Jugador', type: 'select', opts: playerOpts },
      ],
      mongoCode: (v) =>
`db.player_match_stats.aggregate([
    {"$match": {
        "match_id":  ObjectId("${v.match_id  || '<match_id>'}"),
        "player_id": ObjectId("${v.player_id || '<player_id>'}")
    }},
    {"$lookup": {
        "from":       "players",
        "localField": "player_id",
        "as":         "player"
    }},
    {"$unwind": "$player"},
    {"$project": {
        "kills": 1, "deaths": 1, "assists": 1,
        "kda": 1, "acs": 1, "damage_total": 1,
        "nickname": "$player.nickname"
    }}
])`,
      run: async (v) => {
        const all = await api.matchStats(v.match_id)
        const flat = all.flatMap(t => t.players)
        return flat.filter(p => p.team_id === v.player_id || true).slice(0, 10)
      },
    },
    {
      id: 'Q6', badge: 'RANKING',
      title: 'Leaderboard top-N por temporada',
      desc:  'Top jugadores ordenados por la métrica elegida, con nombre y rango resueltos mediante $lookup.',
      fields: [
        { key: 'season_id', label: 'Temporada', type: 'text',   default: 'T2024_S1' },
        { key: 'metric',    label: 'Métrica',   type: 'select', opts: METRICS.map(m => ({ value: m, label: m })) },
        { key: 'limit',     label: 'Top-N',     type: 'number', default: 10 },
      ],
      mongoCode: (v) =>
`db.season_leaderboards.aggregate([
    {"$match": {
        "season_id": "${v.season_id || 'T2024_S1'}",
        "metric":    "${v.metric    || 'kda'}"
    }},
    {"$sort":  {"value": -1}},
    {"$limit": ${v.limit || 10}},
    {"$lookup": {
        "from":         "players",
        "localField":   "player_id",
        "foreignField": "_id",
        "as":           "player"
    }},
    {"$unwind": "$player"},
    {"$project": {
        "position": 1, "value": 1,
        "nickname": "$player.nickname",
        "country":  "$player.country",
        "rank":     "$player.rank"
    }}
])`,
      run: async (v) => api.leaderboard(v.season_id || 'T2024_S1', v.metric || 'kda', Number(v.limit) || 10),
    },
  ]
}

// ── Página principal ──────────────────────────────────────────────────────────

const BADGE_COLORS = {
  INSERT:  { bg: 'rgba(0,200,123,0.15)',  color: '#00C87B' },
  SELECT:  { bg: 'rgba(74,144,217,0.15)', color: '#4A90D9' },
  FILTER:  { bg: 'rgba(255,200,0,0.15)',  color: '#FFC800' },
  RANKING: { bg: 'rgba(255,70,85,0.15)',  color: '#FF4655' },
}

export default function Queries() {
  const [matches,    setMatches]    = useState([])
  const [players,    setPlayers]    = useState([])
  const [activeQ,    setActiveQ]    = useState(0)
  const [values,     setValues]     = useState({})
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [execTime,   setExecTime]   = useState(null)

  useEffect(() => {
    Promise.all([api.matches(null, null, 100), api.players()])
      .then(([m, p]) => { setMatches(m); setPlayers(p) })
  }, [])

  const queryDefs = useQueryDefs(matches, players)
  const q = queryDefs[activeQ]

  function handleTab(i) {
    setActiveQ(i)
    setValues({})
    setResult(null)
    setError(null)
    setExecTime(null)
  }

  function handleChange(key, val) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  async function handleRun() {
    setLoading(true)
    setError(null)
    setResult(null)
    const t0 = performance.now()
    try {
      const res = await q.run(values)
      setResult(res)
      setExecTime(Math.round(performance.now() - t0))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Inicializar defaults al cambiar query
  useEffect(() => {
    const defaults = {}
    q.fields.forEach(f => {
      if (f.default !== undefined) defaults[f.key] = f.default
      else if (f.type === 'select' && f.opts?.length) defaults[f.key] = f.opts[0]?.value ?? ''
      else if (f.type === 'checkbox') defaults[f.key] = false
      else defaults[f.key] = ''
    })
    setValues(defaults)
  }, [activeQ])

  const badgeStyle = BADGE_COLORS[q.badge] ?? {}

  return (
    <div>
      <div className="page-header">
        <h1>Explorador de Queries</h1>
        <p>Ejecuta las 6 consultas del proyecto directamente desde el navegador</p>
      </div>

      {/* ── Tabs de queries ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {queryDefs.map((qd, i) => {
          const bc = BADGE_COLORS[qd.badge] ?? {}
          return (
            <button
              key={qd.id}
              onClick={() => handleTab(i)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: `1px solid ${activeQ === i ? bc.color ?? 'var(--red)' : 'var(--border)'}`,
                background: activeQ === i ? (bc.bg ?? 'rgba(255,70,85,0.1)') : 'var(--surface)',
                color: activeQ === i ? (bc.color ?? 'var(--text)') : 'var(--muted)',
                cursor: 'pointer',
                fontFamily: 'Rajdhani',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.03em',
                transition: 'all 0.15s',
              }}
            >
              {qd.id}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Panel izquierdo: formulario ─────────────────────── */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 4,
                background: badgeStyle.bg, color: badgeStyle.color,
                fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {q.badge}
              </span>
              <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 17 }}>
                {q.id} — {q.title}
              </span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
              {q.desc}
            </p>

            {/* Campos del formulario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {q.fields.map(f => (
                <div key={f.key} className="filter-group">
                  <label className="filter-label">{f.label}</label>

                  {f.type === 'select' && (
                    <select
                      className="filter-select"
                      value={values[f.key] ?? ''}
                      onChange={e => handleChange(f.key, e.target.value)}
                    >
                      {f.opts?.map(o => (
                        typeof o === 'string'
                          ? <option key={o} value={o}>{o}</option>
                          : <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}

                  {f.type === 'number' && (
                    <input
                      className="filter-input"
                      type="number"
                      value={values[f.key] ?? f.default ?? ''}
                      onChange={e => handleChange(f.key, e.target.value)}
                      min={1}
                    />
                  )}

                  {f.type === 'text' && (
                    <input
                      className="filter-input"
                      type="text"
                      value={values[f.key] ?? ''}
                      onChange={e => handleChange(f.key, e.target.value)}
                    />
                  )}

                  {f.type === 'checkbox' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(values[f.key])}
                        onChange={e => handleChange(f.key, e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
                      />
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                        {values[f.key] ? 'Sí' : 'No'}
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </div>

            <button
              className="filter-btn"
              onClick={handleRun}
              disabled={loading}
              style={{ marginTop: 20, width: '100%', padding: '10px 0', fontSize: 15 }}
            >
              {loading ? 'Ejecutando...' : `▶  Ejecutar ${q.id}`}
            </button>
          </div>
        </div>

        {/* ── Panel derecho: código MongoDB ──────────────────────── */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontFamily: 'Rajdhani', fontSize: 12, fontWeight: 600,
              color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Query MongoDB equivalente
            </span>
          </div>
          <CodeBlock code={q.mongoCode(values)} />
        </div>
      </div>

      {/* ── Resultados ─────────────────────────────────────────────── */}
      {(result !== null || error) && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
          }}>
            <h2 className="section-title" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
              Resultado
            </h2>
            {execTime !== null && (
              <span style={{
                fontSize: 12, color: 'var(--green)',
                background: 'rgba(0,200,123,0.1)',
                padding: '2px 8px', borderRadius: 4,
                fontFamily: 'Rajdhani', fontWeight: 600,
              }}>
                {execTime} ms
              </span>
            )}
          </div>

          {error && (
            <div className="error-msg">{error}</div>
          )}

          {result !== null && <ResultView result={result} />}
        </div>
      )}
    </div>
  )
}
