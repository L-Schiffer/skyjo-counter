import { useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../App'

export default function LoginPage() {
  const { setUser, setView, loadData } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await api('POST', '/api/login', { username, password })
    setLoading(false)
    if (res?.error) { setError(res.error); return }
    if (res?.username) { setUser(res); await loadData(); setView('home') }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-5xl font-extrabold text-center tracking-tight mb-1">Skyjo</h1>
        <p className="text-center text-stone-400 text-sm mb-8">Bitte einloggen</p>
        <form onSubmit={handleSubmit} className="card">
          <input
            className="input mb-3"
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={64}
          />
          <input
            className="input mb-5"
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            maxLength={128}
          />
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg">
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
          {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}
        </form>
      </div>
    </div>
  )
}
