import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { api } from '../api'

const SEASON  = 'T2024_S1'
const METRICS = ['kda', 'acs', 'kills', 'damage', 'headshot_pct']

// Métricas que deben mostrarse como enteros
const INT_METRICS = new Set(['kills', 'damage'])

function formatValue(metric, value) {
  if (INT_METRICS.has(metric))        return Math.round(value).toLocaleString()
  if (metric === 'headshot_pct')      return (value * 100).toFixed(1) + '%'
  return Number(value).toFixed(2)
}

const CustomTooltip = ({ active, payload, metric }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#1A2433', border: '1px solid #2A3F55', padding: '8px 12px', borderRadius: 6 }}>
      <p style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{d.nickname}</p>
      <p style={{ color: '#FF4655' }}>{formatValue(metric, d.value)}</p>
    </div>
  )
}

export default function Leaderboard() {
  const [metric,  setMetric]  = useState('kda')
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)

  function load(m) {
    setLoading(true)
    api.leaderboard(SEASON, m, 20)
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(metric) }, [])

  function handleMetric(m) {
    setMetric(m)
    load(m)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Leaderboard</h1>
        <p>Temporada {SEASON}</p>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {METRICS.map(m => (
          <div
            key={m}
            className={'tab' + (metric === m ? ' active' : '')}
            onClick={() => handleMetric(m)}
          >
            {m.toUpperCase()}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={Math.max(data.length * 36 + 32, 200)}>
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: '#8B9BAB', fontSize: 12 }}
                  axisLine={{ stroke: '#2A3F55' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="nickname"
                  width={96}
                  tick={{ fill: '#FFFBF5', fontSize: 13, fontFamily: 'Rajdhani', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ fill: 'rgba(255,70,85,0.08)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={i < 3 ? '#FF4655' : '#2A3F55'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jugador</th>
                  <th>País</th>
                  <th>Rango</th>
                  <th style={{ textAlign: 'right' }}>{metric.toUpperCase()}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.player_id || i}>
                    <td style={{ width: 40 }}>
                      <span style={{
                        fontFamily: 'Rajdhani', fontWeight: 700,
                        color: i < 3 ? '#FF4655' : '#8B9BAB',
                      }}>
                        {row.position ?? i + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.nickname}</td>
                    <td className="td-muted">{row.country}</td>
                    <td>
                      <span className={`rank-${row.rank?.toLowerCase()}`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="td-highlight" style={{ textAlign: 'right' }}>
                      {formatValue(metric, row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
