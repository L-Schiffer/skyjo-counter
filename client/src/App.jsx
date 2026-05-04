import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './lib/api'
import { ModalProvider } from './components/Modal'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import AnalyticsPage from './pages/AnalyticsPage'
import DetailPage from './pages/DetailPage'
import AdminPage from './pages/AdminPage'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export default function App() {
  const [view, setView] = useState('login')
  const [user, setUser] = useState(null)
  const [players, setPlayers] = useState([])
  const [games, setGames] = useState([])
  const [users, setUsers] = useState([])
  const [activeGame, setActiveGame] = useState(null)
  const [detailGame, setDetailGame] = useState(null)

  const loadData = useCallback(async (currentUser) => {
    const [p, g] = await Promise.all([api('GET', '/api/players'), api('GET', '/api/games')])
    setPlayers(p || [])
    setGames(g || [])
    if (currentUser?.isAdmin) {
      const u = await api('GET', '/api/users')
      setUsers(u || [])
    }
  }, [])

  useEffect(() => {
    api('GET', '/api/me').then(me => {
      if (me) { setUser(me); setView('home'); loadData(me) }
    })
  }, [loadData])

  useEffect(() => {
    const handler = () => { setUser(null); setView('login') }
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [])

  const ctx = {
    view, setView, user, setUser,
    players, setPlayers, games, setGames, users, setUsers,
    activeGame, setActiveGame, detailGame, setDetailGame,
    loadData: () => loadData(user),
  }

  const pages = { login: LoginPage, home: HomePage, game: GamePage, analytics: AnalyticsPage, detail: DetailPage, admin: AdminPage }
  const Page = pages[view] ?? LoginPage

  return (
    <AppCtx.Provider value={ctx}>
      <ModalProvider>
        <Page />
      </ModalProvider>
    </AppCtx.Provider>
  )
}
