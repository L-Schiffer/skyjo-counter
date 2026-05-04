import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, KeyRound, Pencil, Check, X, Crown } from 'lucide-react'
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
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  const myId = users.find(u => u.username === user?.username)?.id

  // ── Players ──
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

  // ── Users ──
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

  const toggleAdmin = async (u) => {
    const res = await api('PUT', `/api/users/${u.id}/admin`, { isAdmin: !u.is_admin })
    if (res?.ok) setUsers(us => us.map(x => x.id === u.id ? { ...x, is_admin: !u.is_admin } : x))
    else if (res?.error) await showAlert(res.error, 'Fehler')
  }

  const startEdit = (u) => { setEditId(u.id); setEditName(u.username) }
  const cancelEdit = () => { setEditId(null); setEditName('') }

  const saveUsername = async (id) => {
    if (!editName.trim()) return
    const res = await api('PUT', `/api/users/${id}/username`, { username: editName.trim() })
    if (res?.ok) {
      setUsers(us => us.map(x => x.id === id ? { ...x, username: editName.trim() } : x))
      cancelEdit()
    } else if (res?.error) await showAlert(res.error, 'Fehler')
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24">
      <button className="back-btn" onClick={() => setView('home')}><ArrowLeft size={16} /> Zurück</button>
      <h2 className="section-title text-xl mb-4">Verwaltung</h2>

      <div className="tab-bar">
        {['players', 'users'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'tab-active' : ''}`}>
            {t === 'players' ? 'Spieler' : 'Benutzer'}
          </button>
        ))}
      </div>

      {/* ── Players ── */}
      {tab === 'players' && (
        <>
          <form onSubmit={addPlayer} className="flex gap-2 mb-4">
            <input className="input flex-1" style={{ width: 'auto' }} placeholder="Neuer Spieler…"
              value={newPlayer} onChange={e => setNewPlayer(e.target.value)} maxLength={64} />
            <button type="submit" className="btn-icon"><Plus size={20} /></button>
          </form>
          {players.length === 0 && <p className="text-center text-stone-400 text-sm py-8">Noch keine Spieler.</p>}
          {players.map((p, i) => (
            <div key={p.id} className="list-item">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-medium text-sm">{p.name}</span>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => delPlayer(p.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <>
          {/* Existing users */}
          {users.length > 0 && (
            <div className="card mb-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Bestehende Benutzer</p>
              {users.map(u => (
                <div key={u.id} className="py-3 border-b border-stone-50 last:border-0">
                  {editId === u.id ? (
                    /* Edit username inline */
                    <div className="flex items-center gap-2">
                      <input
                        className="input flex-1 py-2 text-sm"
                        style={{ width: 'auto' }}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveUsername(u.id); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus
                        maxLength={64}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => saveUsername(u.id)}><Check size={14} /></button>
                      <button className="btn btn-secondary btn-sm" onClick={cancelEdit}><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-sm">{u.username}</span>
                        {u.is_admin && <span className="ml-1.5 text-xs text-amber-600">👑 Admin</span>}
                        <div className="text-xs text-stone-400 mt-0.5">ID {u.id} · {u.created_at?.slice(0, 10)}</div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {/* Edit username */}
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(u)} title="Username ändern">
                          <Pencil size={13} />
                        </button>
                        {/* Toggle admin (not self) */}
                        {u.id !== myId && (
                          <button
                            className={`btn btn-sm ${u.is_admin ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'btn-secondary'}`}
                            onClick={() => toggleAdmin(u)}
                            title={u.is_admin ? 'Admin entfernen' : 'Zum Admin machen'}
                          >
                            <Crown size={13} />
                          </button>
                        )}
                        {/* Reset password */}
                        <button className="btn btn-secondary btn-sm" onClick={() => resetPw(u.id, u.username)} title="Passwort zurücksetzen">
                          <KeyRound size={13} />
                        </button>
                        {/* Delete (not self) */}
                        {u.id !== myId && (
                          <button className="btn btn-danger btn-sm" onClick={() => delUser(u.id)} title="Löschen">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create new user */}
          <form onSubmit={addUser} className="card">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Neuen Benutzer anlegen</p>
            <input className="input mb-2" type="text" placeholder="Username"
              value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
              autoComplete="off" maxLength={64} />
            <input className="input mb-3" type="password" placeholder="Passwort"
              value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
              autoComplete="new-password" maxLength={128} />
            <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
              <input type="checkbox" checked={newUser.isAdmin}
                onChange={e => setNewUser(u => ({ ...u, isAdmin: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600" />
              Admin
            </label>
            <button type="submit" className="btn btn-primary btn-lg">Benutzer anlegen</button>
          </form>
        </>
      )}
    </div>
  )
}
