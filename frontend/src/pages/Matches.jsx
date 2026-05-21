import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const MAPS   = ['', 'Ascent', 'Bind', 'Haven', 'Split', 'Fracture', 'Pearl', 'Lotus']
const AGENTS = ['', 'Jett', 'Sage', 'Omen', 'Sova', 'Chamber', 'Reyna', 'Neon', 'Fade']

export default function Matches() {
  const [mapa,    setMapa]    = useState('')
  const [agente,  setAgente]  = useState('')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function load() {
    setLoading(true)
    api.matches(mapa || null, agente || null, 30)
      .then(setMatches)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="page-header">
        <h1>Partidas</h1>
        <p>Filtra por mapa y agente — Q4</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Mapa</label>
          <select className="filter-select" value={mapa} onChange={e => setMapa(e.target.value)}>
            {MAPS.map(m => <option key={m} value={m}>{m || 'Todos'}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Agente</label>
          <select className="filter-select" value={agente} onChange={e => setAgente(e.target.value)}>
            {AGENTS.map(a => <option key={a} value={a}>{a || 'Todos'}</option>)}
          </select>
        </div>
        <button className="filter-btn" onClick={load}>Buscar</button>
      </div>

      {loading ? (
        <div className="loading">Cargando partidas...</div>
      ) : matches.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 48 }}>
          No se encontraron partidas con los filtros aplicados.
        </p>
      ) : (
        <div className="match-grid">
          {matches.map(m => {
            const agentList = [...new Set(m.player_agents?.map(pa => pa.agent) ?? [])]
            const [teamA, teamB] = m.teams ?? []
            const winId = m.winning_team_id
            return (
              <div key={m._id} className="match-card" onClick={() => navigate(`/matches/${m._id}`)}>
                <div className="match-card-header">
                  <span className="match-map">{m.map}</span>
                  <span className="match-type">{m.match_type}</span>
                </div>

                {/* Equipos enfrentados */}
                {teamA && teamB && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    margin: '10px 0', fontFamily: 'Rajdhani',
                  }}>
                    <span style={{
                      fontWeight: 700, fontSize: 15,
                      color: teamA.team_id === winId ? 'var(--green)' : 'var(--text)',
                    }}>
                      {teamA.name}
                    </span>
                    <span style={{ color: 'var(--border)', fontSize: 13 }}>vs</span>
                    <span style={{
                      fontWeight: 700, fontSize: 15,
                      color: teamB.team_id === winId ? 'var(--green)' : 'var(--text)',
                    }}>
                      {teamB.name}
                    </span>
                  </div>
                )}

                <div className="match-date">
                  {new Date(m.start_time).toLocaleString('es', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                <div className="match-agents">
                  {agentList.map(a => (
                    <span key={a} className="agent-chip">{a}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
