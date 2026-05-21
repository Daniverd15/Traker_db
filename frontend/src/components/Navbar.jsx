import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../api'

export default function Navbar() {
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    if (!confirm('¿Repoblar la base de datos con datos de muestra?')) return
    setSeeding(true)
    try {
      await api.seed()
      alert('✓ Seed completado — recarga la página')
    } catch (e) {
      alert('Error al ejecutar seed: ' + e.message)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <nav className="navbar">
      <span className="navbar-logo">VPT <span>TRACKER</span></span>
      <div className="navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/leaderboard"
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          Leaderboard
        </NavLink>
        <NavLink
          to="/matches"
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          Partidas
        </NavLink>
        <NavLink
          to="/players"
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          Jugadores
        </NavLink>
      </div>
      <button className="nav-seed-btn" onClick={handleSeed} disabled={seeding}>
        {seeding ? 'Cargando...' : '⟳ Seed DB'}
      </button>
    </nav>
  )
}
