import { useState } from 'react'
import { Plus, Settings, LogOut, BarChart2 } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../App'
import { useModal } from '../components/Modal'
import { COLORS } from '../lib/constants'

export default function HomePage() {
  const { user, setUser, setView, players, setPlayers, games, setActiveGame, loadData } = useApp()
  const { showAlert } = useModal()
  const [newPlayer, setNewPlayer] = useState('')
  const [selected, setSelected] = useState(new Set())

  const finishedGames = games.filter(g => g.finished_at)

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const addPlayer = async (e) => {
    e.preventDefault()
    const name = newPlayer.trim()
    if (!name) return
    const res = await api('POST', '/api/players', { name })
    if (res?.id) { setPlayers(p => [...p, res]); setNewPlayer('') }
    else if (res?.error) await showAlert(res.error, 'Fehler')
  }

  const startGame = async () => {
    const ids = [...selected]
    if (ids.length < 2) { await showAlert('Mindestens 2 Spieler auswählen.', 'Hinweis'); return }
    const res = await api('POST', '/api/games', { playerIds: ids })
    if (res?.id) {
      setActiveGame({ id: res.id, players: players.filter(p => ids.includes(p.id)) })
      setSelected(new Set())
      setView('game')
    }
  }

  const doLogout = async () => {
    await api('POST', '/api/logout')
    setUser(null)
    setView('login')
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-1 pt-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Skyjo</h1>
        <div className="flex gap-2">
          {user?.isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => setView('admin')}>
              <Settings size={16} />
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={doLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
      <p className="text-stone-400 text-sm mb-5">Hallo, {user?.username} 👋</p>

      <div className="card">
        <h2 className="section-title text-base mb-3">Spieler auswählen</h2>
        <form onSubmit={addPlayer} className="flex gap-2 mb-3">
          <input
            className="input flex-1"
            style={{ width: 'auto' }}
            placeholder="Neuer Spieler…"
            value={newPlayer}
            onChange={e => setNewPlayer(e.target.value)}
            maxLength={64}
          />
          <button type="submit" className="btn-icon">
            <Plus size={20} />
          </button>
        </form>

        {players.map((p, i) => (
          <label key={p.id} className="flex items-center gap-3 bg-stone-50 px-4 py-3 rounded-xl mb-2 cursor-pointer hover:bg-stone-100 transition-colors">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="flex-1 font-medium text-sm">{p.name}</span>
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="w-5 h-5 accent-emerald-600 cursor-pointer"
            />
          </label>
        ))}

        <button
          className="btn btn-primary btn-lg mt-3"
          onClick={startGame}
          disabled={selected.size < 2}
        >
          Spiel starten ({selected.size} Spieler)
        </button>
      </div>

      {finishedGames.length > 0 && (
        <button className="btn btn-dark btn-lg" onClick={() => setView('analytics')}>
          <BarChart2 size={16} className="mr-2" />
          Statistiken ({finishedGames.length} Spiele)
        </button>
      )}
    </div>
  )
}
