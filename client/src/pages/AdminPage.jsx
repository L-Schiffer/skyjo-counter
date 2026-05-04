import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, KeyRound } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../App'
import { useModal } from '../components/Modal'
import { COLORS } from '../lib/constants'

export default function AdminPage() {
  const { user, players, setPlayers, users, setUsers, setView } = useApp()
  const { showConfirm, showAlert, showPrompt } = useModal()
  const [tab, setTab] = useState('players')
  const [newPlayer, setNewPlayer] = useState('')
  const [newUser, setNewUser] = useState({ username: '', password: '', isAdmin: false })

  const delPlayer = async (id) => {
    if (!await showConfirm('Spieler löschen', 'Diesen Spieler wirklich löschen?')) return
    await api('DELETE', `/api/players/${id}`)
    setPlayers(p => p.filter(x => x.id !== id))
  }

  const addPlayer = async (e) => {
    e.preventDefault()
    const name = newPlayer.trim()
    if (!name) return
    const res = await api('POST', '/api/players', { name })
    if (res?.id) { setPlayers(p => [...p, res]); setNewPlayer('') }
    else if (res?.error) await showAlert(res.error, 'Fehler')
  }

  const addUser = async (e) => {
    e.preventDefault()
    const { username, password, isAdmin } = newUser
    if (!username || !password) { await showAlert('Username und Passwort erforderlich.', 'Hinweis'); return }
    const res = await api('POST', '/api/users', { username, password, isAdmin })
    if (res?.id) {
      setUsers(u => [...u, { id: res.id, username, is_admin: res.is_admin, created_at: new Date().toISOString() }])
      setNewUser({ username: '', password: '', isAdmin: false })
    } else if (res?.error) await showAlert(res.error, 'Fehler')
  }

  const delUser = async (id) => {
    if (!await showConfirm('Benutzer löschen', 'Diesen Benutzer wirklich löschen?')) return
    await api('DELETE', `/api/users/${id}`)
    setUsers(u => u.filter(x => x.id !== id))
  }

  const resetPw = async (id, name) => {
    const pw = await showPrompt(`Neues Passwort für ${name}`, 'Neues Passwort')
    if (!pw) return
    await api('PUT', `/api/users/${id}/password`, { password: pw })
    await showAlert('Passwort wurde geändert.', 'Erfolg')
  }

  const myId = users.find(u => u.username === user?.username)?.id

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24">
      <button className="back-btn" onClick={() => setView('home')}><ArrowLeft size={16} /> Zurück</button>
      <h2 className="section-title text-xl mb-4">Verwaltung</h2>

      {/* Tabs */}
      <div className="tab-bar">
        {['players', 'users'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'tab-active' : ''}`}>
            {t === 'players' ? 'Spieler' : 'Benutzer'}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <>
          <form onSubmit={addPlayer} className="flex gap-2 mb-4">
            <input
              className="input flex-1"
              style={{ width: 'auto' }}
              placeholder="Neuer Spieler…"
              value={newPlayer}
              onChange={e => setNewPlayer(e.target.value)}
              maxLength={64}
            />
            <button type="submit" className="btn-icon"><Plus size={20} /></button>
          </form>
          {players.length === 0 && <p className="text-center text-stone-400 text-sm py-8">Noch keine Spieler.</p>}
          {players.map((p, i) => (
            <div key={p.id} className="list-item">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-medium text-sm">{p.name}</span>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => delPlayer(p.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </>
      )}

      {tab === 'users' && (
        <>
          <form onSubmit={addUser} className="card mb-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Neuen Benutzer anlegen</p>
            <input
              className="input mb-2"
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
              autoComplete="off"
              maxLength={64}
            />
            <input
              className="input mb-3"
              type="password"
              placeholder="Passwort"
              value={newUser.password}
              onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
              autoComplete="new-password"
              maxLength={128}
            />
            <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={newUser.isAdmin}
                onChange={e => setNewUser(u => ({ ...u, isAdmin: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600"
              />
              Admin
            </label>
            <button type="submit" className="btn btn-primary btn-lg">Benutzer anlegen</button>
          </form>

          {users.map(u => (
            <div key={u.id} className="list-item">
              <div>
                <div className="font-semibold text-sm">{u.username} {u.is_admin ? '👑' : ''}</div>
                <div className="text-xs text-stone-400">ID {u.id} · {u.created_at?.slice(0, 10)}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => resetPw(u.id, u.username)}>
                  <KeyRound size={14} />
                </button>
                {u.id !== myId && (
                  <button className="btn btn-danger btn-sm" onClick={() => delUser(u.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
