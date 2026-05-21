import { useEffect, useState } from 'react'
import { api } from '../api'

const ROLES = ['', 'Duelista', 'Centinela', 'Controlador', 'Iniciador']

function roleBadge(role) {
  const map = {
    Duelista:    'badge-role-duelista',
    Centinela:   'badge-role-centinela',
    Controlador: 'badge-role-controlador',
    Iniciador:   'badge-role-iniciador',
  }
  return <span className={`badge ${map[role] ?? ''}`}>{role}</span>
}

export default function Players() {
  const [players, setPlayers] = useState([])
  const [rol,     setRol]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.players().then(setPlayers).finally(() => setLoading(false))
  }, [])

  const visible = rol ? players.filter(p => p.role === rol) : players

  return (
    <div>
      <div className="page-header">
        <h1>Jugadores</h1>
        <p>{players.length} registrados</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Rol</label>
          <select className="filter-select" value={rol} onChange={e => setRol(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r || 'Todos'}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando jugadores...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nickname</th>
                <th>País</th>
                <th>Rol</th>
                <th>Rango</th>
                <th>Equipo</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(p => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 600, fontFamily: 'Rajdhani', fontSize: 15 }}>{p.nickname}</td>
                  <td className="td-muted">{p.country}</td>
                  <td>{roleBadge(p.role)}</td>
                  <td>
                    <span className={`rank-${p.rank?.toLowerCase()}`}>{p.rank}</span>
                  </td>
                  <td className="td-muted">{p.team_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
