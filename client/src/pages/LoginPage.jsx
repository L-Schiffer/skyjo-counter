import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../App'

export default function LoginPage() {
  const { setUser, setView, loadData } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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
          <div className="relative mb-5">
            <input
              className="input pr-11"
              type={showPw ? 'text' : 'password'}
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              maxLength={128}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg">
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
          {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}
        </form>
      </div>
    </div>
  )
}
