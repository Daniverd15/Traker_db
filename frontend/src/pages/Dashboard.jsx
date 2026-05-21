import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { api } from '../api'

const SEASON = 'T2024_S1'
const RED    = '#FF4655'
const DIM    = '#2A3F55'

function StatCard({ title, value }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value ?? '—'}</div>
    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#1A2433', border: '1px solid #2A3F55', padding: '8px 12px', borderRadius: 6 }}>
      <p style={{ fontFamily: 'Rajdhani', fontWeight: 700, marginBottom: 2 }}>{d.nickname}</p>
      <p style={{ color: '#FF4655', fontWeight: 600 }}>KDA {d.value.toFixed(2)}</p>
    </div>
  )
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [top,     setTop]     = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.stats(),
      api.leaderboard(SEASON, 'kda', 10),
      api.matches(null, null, 5),
    ])
      .then(([s, lb, m]) => { setStats(s); setTop(lb); setMatches(m) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Cargando dashboard...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Temporada {SEASON} — resumen general</p>
      </div>

      <div className="stats-grid">
        <StatCard title="Jugadores"  value={stats?.players} />
        <StatCard title="Equipos"    value={stats?.teams} />
        <StatCard title="Partidas"   value={stats?.matches} />
        <StatCard title="Eventos"    value={stats?.events?.toLocaleString()} />
      </div>

      <h2 className="section-title">Top 10 KDA — {SEASON}</h2>
      <div className="card" style={{ marginBottom: 32 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            layout="vertical"
            data={top}
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <XAxis
              type="number"
              domain={[0, 'dataMax + 0.5']}
              tick={{ fill: '#8B9BAB', fontSize: 12 }}
              axisLine={{ stroke: '#2A3F55' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="nickname"
              width={90}
              tick={{ fill: '#FFFBF5', fontSize: 13, fontFamily: 'Rajdhani', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,70,85,0.08)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {top.map((_, i) => (
                <Cell key={i} fill={i === 0 ? RED : DIM} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="section-title">Últimas partidas</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mapa</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Agentes</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(m => (
              <tr
                key={m._id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/matches/${m._id}`)}
              >
                <td className="td-highlight">{m.map}</td>
                <td className="td-muted" style={{ textTransform: 'capitalize' }}>{m.match_type}</td>
                <td className="td-muted">{new Date(m.start_time).toLocaleString('es')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[...new Set(m.player_agents?.map(pa => pa.agent))].map(a => (
                      <span key={a} className="agent-chip">{a}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
