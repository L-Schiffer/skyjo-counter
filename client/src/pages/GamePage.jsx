import { useState } from 'react'
import { Flag, Save } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../App'
import { useModal } from '../components/Modal'
import { COLORS } from '../lib/constants'

function useTotals(players, rounds) {
  const t = {}
  players.forEach(p => { t[p.id] = rounds.reduce((s, r) => s + (r.scores[p.id] || 0), 0) })
  return t
}

export default function GamePage() {
  const { activeGame, setActiveGame, setView, loadData } = useApp()
  const { showAlert } = useModal()
  const [rounds, setRounds] = useState([])
  const [scores, setScores] = useState({})
  const [enderId, setEnderId] = useState(null)

  const players = activeGame?.players ?? []
  const totals = useTotals(players, rounds)
  const sorted = [...players].sort((a, b) => totals[a.id] - totals[b.id])
  const gameOver = sorted.some(p => totals[p.id] >= 100)

  const submitRound = async () => {
    const s = {}
    for (const p of players) {
      const v = scores[p.id]
      if (v === undefined || v === '') { await showAlert(`Punkte für ${p.name} fehlen.`, 'Hinweis'); return }
      s[p.id] = Number(v)
    }
    if (!enderId) { await showAlert('Bitte markieren, wer die Runde beendet hat.', 'Hinweis'); return }
    const res = await api('POST', `/api/games/${activeGame.id}/rounds`, { scores: s, enderId })
    if (res?.roundId) {
      setRounds(r => [...r, { scores: res.scores, enderId, doubled: res.doubled }])
      setScores({})
      setEnderId(null)
    }
  }

  const finishGame = async () => {
    const winnerId = sorted[0].id
    await api('POST', `/api/games/${activeGame.id}/finish`, { winnerId })
    setActiveGame(null)
    await loadData()
    setView('home')
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h2 className="section-title text-xl">Runde {rounds.length + 1}</h2>
        <button className="btn btn-secondary btn-sm" onClick={finishGame}>Beenden</button>
      </div>

      {/* Standings */}
      <div className="card">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Zwischenstand</p>
        {sorted.map((p, i) => {
          const ci = players.indexOf(p)
          const w = Math.min(Math.max((totals[p.id] / 100) * 100, 3), 100)
          return (
            <div key={p.id} className="flex items-center gap-3 mb-3 last:mb-0">
              <span className="text-xs font-bold text-stone-300 w-4 text-center">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{p.name}{i === 0 && rounds.length > 0 ? ' 👑' : ''}</span>
                  <span className={`text-sm font-bold ${totals[p.id] >= 100 ? 'text-red-500' : ''}`}>{totals[p.id]}</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${w}%`, background: COLORS[ci % COLORS.length] }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Game over */}
      {gameOver ? (
        <div className="card bg-amber-50/80 border-amber-200 text-center py-6">
          <div className="text-4xl mb-2">🏆</div>
          <p className="font-display font-bold text-lg text-amber-900">{sorted[0].name} gewinnt!</p>
          <p className="text-amber-700 text-sm mb-4">{totals[sorted[0].id]} Punkte</p>
          <button className="btn btn-primary btn-lg" onClick={finishGame}>
            <Save size={16} className="mr-2" /> Spiel speichern
          </button>
        </div>
      ) : (
        /* Round input */
        <div className="card">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Punkte eintragen</p>
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setEnderId(p.id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  enderId === p.id
                    ? 'bg-amber-400 text-amber-900 shadow-md scale-105'
                    : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                }`}
              >
                <Flag size={15} />
              </button>
              <span className="flex-1 text-sm font-medium">{p.name}</span>
              <input
                type="number"
                inputMode="numeric"
                value={scores[p.id] ?? ''}
                onChange={e => setScores(s => ({ ...s, [p.id]: e.target.value }))}
                placeholder="—"
                className="w-16 px-3 py-2 border border-stone-300 rounded-xl text-sm text-right bg-stone-50 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          ))}
          {!enderId && <p className="text-xs text-amber-600 flex items-center gap-1 mt-1 mb-2">🏁 Wer hat die Runde beendet?</p>}
          <button className="btn btn-primary btn-lg mt-2" onClick={submitRound}>Runde speichern</button>
        </div>
      )}

      {/* History */}
      {rounds.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Verlauf</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-1.5 px-1 text-stone-400 font-medium border-b border-stone-100">#</th>
                  {players.map(p => (
                    <th key={p.id} className="text-right py-1.5 px-1 text-stone-400 font-medium border-b border-stone-100">{p.name.slice(0, 5)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    <td className="py-1.5 px-1 text-stone-400">{i + 1}</td>
                    {players.map(p => (
                      <td key={p.id} className={`py-1.5 px-1 text-right font-medium ${r.enderId === p.id && r.doubled ? 'text-red-500' : ''}`}>
                        {r.scores[p.id]}{r.enderId === p.id ? (r.doubled ? ' ⚡' : ' 🏁') : ''}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="pt-2 px-1 text-stone-400">Σ</td>
                  {players.map(p => <td key={p.id} className="pt-2 px-1 text-right">{totals[p.id]}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
