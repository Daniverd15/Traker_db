import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'
import Matches from './pages/Matches'
import MatchDetail from './pages/MatchDetail'
import Players from './pages/Players'
import Queries from './pages/Queries'

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/leaderboard"   element={<Leaderboard />} />
            <Route path="/matches"       element={<Matches />} />
            <Route path="/matches/:id"   element={<MatchDetail />} />
            <Route path="/players"       element={<Players />} />
            <Route path="/queries"       element={<Queries />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
