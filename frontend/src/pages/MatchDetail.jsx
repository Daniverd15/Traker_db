import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { api } from '../api'

// ── Marcador principal ────────────────────────────────────────────────────────

function Scoreboard({ match }) {
  const [a, b] = match.teams_info ?? []
  if (!a || !b) return null

  const dur = match.end_time
    ? Math.round((new Date(match.end_time) - new Date(match.start_time)) / 60000)
    : null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '28px 32px',
      marginBottom: 24,
    }}>
      {/* Mapa y meta */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{
          fontFamily: 'Rajdhani', fontSize: 13, fontWeight: 600,
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {match.map}
          &nbsp;·&nbsp;
          <span style={{ textTransform: 'capitalize' }}>{match.match_type}</span>
          &nbsp;·&nbsp;
          {new Date(match.start_time).toLocaleDateString('es', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
          {dur && ` · ${dur} min`}
          &nbsp;·&nbsp;
          {match.rounds?.length ?? 0} rondas
        </span>
      </div>

      {/* Teams + Score */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Equipo A */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700,
            color: a.is_winner ? 'var(--text)' : 'var(--muted)',
          }}>
            {a.name}
            {a.is_winner && (
              <span style={{
                marginLeft: 10, fontSize: 11, color: 'var(--green)',
                background: 'rgba(0,200,123,0.15)', padding: '2px 8px',
                borderRadius: 4, fontWeight: 600, verticalAlign: 'middle',
              }}>
                GANADOR
              </span>
            )}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
            {a.region} &nbsp;·&nbsp;
            <span style={{ textTransform: 'capitalize' }}>{a.side}</span>
          </div>
        </div>

        {/* Marcador numérico */}
        <div style={{ textAlign: 'center', minWidth: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{
              fontFamily: 'Rajdhani', fontSize: 52, fontWeight: 700, lineHeight: 1,
              color: a.is_winner ? 'var(--green)' : '#FF8090',
            }}>
              {a.score}
            </span>
            <span style={{ fontFamily: 'Rajdhani', fontSize: 28, color: 'var(--border)' }}>:</span>
            <span style={{
              fontFamily: 'Rajdhani', fontSize: 52, fontWeight: 700, lineHeight: 1,
              color: b.is_winner ? 'var(--green)' : '#FF8090',
            }}>
              {b.score}
            </span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, letterSpacing: '0.05em' }}>
            RONDAS GANADAS
          </div>
        </div>

        {/* Equipo B */}
        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700,
            color: b.is_winner ? 'var(--text)' : 'var(--muted)',
          }}>
            {b.is_winner && (
              <span style={{
                marginRight: 10, fontSize: 11, color: 'var(--green)',
                background: 'rgba(0,200,123,0.15)', padding: '2px 8px',
                borderRadius: 4, fontWeight: 600, verticalAlign: 'middle',
              }}>
                GANADOR
              </span>
            )}
            {b.name}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
            <span style={{ textTransform: 'capitalize' }}>{b.side}</span>
            &nbsp;·&nbsp;{b.region}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tabla de stats de un equipo ───────────────────────────────────────────────

function TeamStatsTable({ team, accentColor }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
      }}>
        <div style={{
          width: 4, height: 20, background: accentColor, borderRadius: 2,
        }} />
        <span style={{
          fontFamily: 'Rajdhani', fontSize: 17, fontWeight: 700, color: 'var(--text)',
        }}>
          {team.name}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'capitalize' }}>
          {team.region} · {team.side}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Jugador</th>
              <th>País</th>
              <th>Agente</th>
              <th style={{ textAlign: 'center' }}>K</th>
              <th style={{ textAlign: 'center' }}>D</th>
              <th style={{ textAlign: 'center' }}>A</th>
              <th style={{ textAlign: 'right' }}>KDA</th>
              <th style={{ textAlign: 'right' }}>ACS</th>
              <th style={{ textAlign: 'right' }}>HS%</th>
              <th style={{ textAlign: 'right' }}>Daño</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, fontFamily: 'Rajdhani', fontSize: 15 }}>
                  {s.nickname}
                </td>
                <td className="td-muted">{s.country}</td>
                <td>
                  <span className="agent-chip">{s.agent}</span>
                </td>
                <td className="td-green"     style={{ textAlign: 'center' }}>{Math.round(s.kills)}</td>
                <td style={{ color: '#FF8090', textAlign: 'center' }}>{Math.round(s.deaths)}</td>
                <td className="td-muted"     style={{ textAlign: 'center' }}>{Math.round(s.assists)}</td>
                <td className="td-highlight" style={{ textAlign: 'right' }}>{s.kda?.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{s.acs?.toFixed(0)}</td>
                <td style={{ textAlign: 'right' }}>{(s.headshot_pct * 100).toFixed(0)}%</td>
                <td className="td-muted"     style={{ textAlign: 'right' }}>
                  {Math.round(s.damage_total)?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab: Stats por equipo ─────────────────────────────────────────────────────

function StatsTab({ matchId }) {
  const [teams,   setTeams]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.matchStats(matchId).then(setTeams).finally(() => setLoading(false))
  }, [matchId])

  if (loading) return <div className="loading">Cargando stats...</div>
  if (!teams.length) return <p style={{ color: 'var(--muted)' }}>Sin datos.</p>

  const COLORS = ['#4A90D9', '#FF4655']

  return (
    <div>
      {teams.map((team, i) => (
        <TeamStatsTable key={team.team_id} team={team} accentColor={COLORS[i]} />
      ))}
    </div>
  )
}

// ── Tab: Rondas ───────────────────────────────────────────────────────────────

function RoundsTab({ rounds, teamsInfo }) {
  if (!rounds?.length) return <p style={{ color: 'var(--muted)' }}>Sin datos de rondas.</p>

  const [a, b] = teamsInfo ?? []

  function winnerName(winning_team_id) {
    if (a && winning_team_id === a.team_id) return a.name
    if (b && winning_team_id === b.team_id) return b.name
    return '—'
  }

  function winnerColor(winning_team_id) {
    if (a && winning_team_id === a.team_id) return '#4A90D9'
    if (b && winning_team_id === b.team_id) return '#FF4655'
    return 'var(--muted)'
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ronda</th>
            <th>Ganador</th>
            <th>Condición</th>
            <th style={{ textAlign: 'right' }}>{a?.name ?? 'Equipo A'} gasta</th>
            <th style={{ textAlign: 'right' }}>{b?.name ?? 'Equipo B'} gasta</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map(r => (
            <tr key={r.round_number}>
              <td>
                <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--muted)' }}>
                  #{r.round_number}
                </span>
              </td>
              <td>
                <span style={{ color: winnerColor(r.winning_team_id), fontWeight: 600 }}>
                  {winnerName(r.winning_team_id)}
                </span>
              </td>
              <td style={{ textTransform: 'capitalize', color: 'var(--muted)' }}>
                {r.win_condition?.replace(/_/g, ' ')}
              </td>
              <td className="td-muted" style={{ textAlign: 'right' }}>
                {r.economy?.team_a_spent?.toLocaleString() ?? '—'}
              </td>
              <td className="td-muted" style={{ textAlign: 'right' }}>
                {r.economy?.team_b_spent?.toLocaleString() ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab: Timeline ─────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1A2433', border: '1px solid #2A3F55',
      padding: '8px 12px', borderRadius: 6,
    }}>
      <p style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 2 }}>Ronda {label}</p>
      <p style={{ color: '#FF4655', fontFamily: 'Rajdhani', fontWeight: 700 }}>
        {payload[0].value} kills
      </p>
    </div>
  )
}

function TimelineTab({ matchId, totalRounds }) {
  const [round,        setRound]        = useState(1)
  const [kills,        setKills]        = useState([])
  const [roundsData,   setRoundsData]   = useState([])
  const [loadingKills, setLoadingKills] = useState(false)
  const [loadingChart, setLoadingChart] = useState(true)

  // Gráfico: kills por ronda — se carga una sola vez
  useEffect(() => {
    api.roundsSummary(matchId)
      .then(setRoundsData)
      .finally(() => setLoadingChart(false))
  }, [matchId])

  // Tabla: kills de la ronda seleccionada
  function loadRound(r) {
    setLoadingKills(true)
    api.timeline(matchId, r).then(setKills).finally(() => setLoadingKills(false))
  }

  useEffect(() => { loadRound(1) }, [matchId])

  return (
    <div>
      {/* ── Gráfico kills por ronda ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Kills por ronda — partida completa</div>
        {loadingChart ? (
          <div className="loading" style={{ padding: 32 }}>Cargando...</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={roundsData}
              margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
              onClick={d => { if (d?.activeLabel) { const r = Number(d.activeLabel); setRound(r); loadRound(r) } }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3F55" vertical={false} />
              <XAxis
                dataKey="round"
                tick={{ fill: '#8B9BAB', fontSize: 11 }}
                axisLine={{ stroke: '#2A3F55' }}
                tickLine={false}
                label={{ value: 'Ronda', position: 'insideBottom', offset: -2, fill: '#8B9BAB', fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#8B9BAB', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,70,85,0.08)' }} />
              <Bar dataKey="kills" radius={[3, 3, 0, 0]}>
                {roundsData.map(d => (
                  <Cell
                    key={d.round}
                    fill={d.round === round ? '#FF4655' : '#2A3F55'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6 }}>
          Haz clic en una barra para ver los kills de esa ronda
        </p>
      </div>

      {/* ── Selector de ronda ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="filter-group">
          <label className="filter-label">Ronda</label>
          <select
            className="filter-select"
            value={round}
            onChange={e => { const r = Number(e.target.value); setRound(r); loadRound(r) }}
            style={{ minWidth: 90 }}
          >
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map(r => (
              <option key={r} value={r}>Ronda {r}</option>
            ))}
          </select>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 13, marginTop: 18 }}>
          {kills.length} kill{kills.length !== 1 ? 's' : ''} en esta ronda
        </span>
      </div>

      {/* ── Tabla de kills ──────────────────────────────────────────── */}
      {loadingKills ? (
        <div className="loading">Cargando kills...</div>
      ) : kills.length === 0 ? (
        <p style={{ color: 'var(--muted)', padding: '24px 0' }}>Sin kills registradas en esta ronda.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Asesino</th>
                <th style={{ color: '#FF8090' }}>Víctima</th>
                <th>Arma</th>
                <th style={{ textAlign: 'right' }}>Daño</th>
                <th style={{ textAlign: 'center' }}>Headshot</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {kills.map((k, i) => (
                <tr key={i}>
                  <td className="td-muted" style={{ width: 36 }}>{i + 1}</td>
                  <td style={{ fontWeight: 700, fontFamily: 'Rajdhani', fontSize: 15, color: 'var(--green)' }}>
                    {k.killer}
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: 'Rajdhani', fontSize: 15, color: '#FF8090' }}>
                    {k.victim}
                  </td>
                  <td>{k.weapon || '—'}</td>
                  <td className="td-highlight" style={{ textAlign: 'right' }}>
                    {Math.round(k.damage)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {k.headshot
                      ? <span style={{ color: '#FF4655', fontWeight: 700 }}>✓ HS</span>
                      : <span className="td-muted">—</span>}
                  </td>
                  <td className="td-muted">
                    {new Date(k.event_time).toLocaleTimeString('es')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MatchDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [match,   setMatch]   = useState(null)
  const [tab,     setTab]     = useState('stats')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.match(id).then(setMatch).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Cargando partida...</div>
  if (!match)  return <div className="error-msg">Partida no encontrada.</div>

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', marginBottom: 16, fontSize: 13, padding: 0,
        }}
      >
        ← Volver a partidas
      </button>

      <Scoreboard match={match} />

      <div className="tabs">
        {[
          { key: 'stats',    label: 'Stats' },
          { key: 'rondas',   label: 'Rondas' },
          { key: 'timeline', label: 'Timeline' },
        ].map(t => (
          <div
            key={t.key}
            className={'tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'stats'    && <StatsTab    matchId={id} />}
      {tab === 'rondas'   && <RoundsTab   rounds={match.rounds} teamsInfo={match.teams_info} />}
      {tab === 'timeline' && <TimelineTab matchId={id} totalRounds={match.rounds?.length ?? 13} />}
    </div>
  )
}
