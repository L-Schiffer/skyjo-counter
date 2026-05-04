import { ArrowLeft, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../App'
import { useModal } from '../components/Modal'
import { COLORS } from '../lib/constants'

export default function DetailPage() {
  const { detailGame: g, setDetailGame, games, setGames, setView } = useApp()
  const { showConfirm } = useModal()

  if (!g) { setView('analytics'); return null }

  const sorted = [...g.players].sort((a, b) => (g.totals[a.id] || 0) - (g.totals[b.id] || 0))

  const deleteGame = async () => {
    if (!await showConfirm('Spiel löschen', 'Dieses Spiel wirklich löschen? Alle Runden gehen verloren.')) return
    await api('DELETE', `/api/games/${g.id}`)
    setGames(games.filter(x => x.id !== g.id))
    setDetailGame(null)
    setView('analytics')
  }

  // SVG line chart
  const cumData = g.players.map(p => {
    let s = 0
    return { name: p.name, points: g.rounds.map(r => { s += r.scores[p.id] || 0; return s }) }
  })
  const maxVal = Math.max(...cumData.flatMap(d => d.points), 1)
  const numR = g.rounds.length
  const W = 320, H = 160, PAD = 30

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24">
      <button className="back-btn" onClick={() => setView('analytics')}><ArrowLeft size={16} /> Zurück</button>
      <h2 className="section-title text-xl mb-1">Spiel vom {new Date(g.started_at).toLocaleDateString('de-DE')}</h2>
      <p className="text-sm text-stone-400 mb-5">{g.rounds.length} Runden · Gewinner: {g.winner || '?'} 🏆</p>

      {/* Line chart */}
      <div className="card">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Punkteverlauf</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#e7e5e4" strokeWidth="1" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#e7e5e4" strokeWidth="1" />
          <text x={PAD} y={H - 8} fontSize="9" fill="#a8a29e">1</text>
          <text x={W - PAD} y={H - 8} fontSize="9" fill="#a8a29e" textAnchor="end">{numR}</text>
          <text x={PAD - 4} y={PAD + 4} fontSize="9" fill="#a8a29e" textAnchor="end">{maxVal}</text>
          <text x={PAD - 4} y={H - PAD} fontSize="9" fill="#a8a29e" textAnchor="end">0</text>
          {cumData.map((d, di) => {
            const pts = d.points.map((v, i) =>
              `${PAD + (i / Math.max(numR - 1, 1)) * (W - PAD * 2)},${H - PAD - (v / maxVal) * (H - PAD * 2)}`
            ).join(' ')
            return <polyline key={di} points={pts} fill="none" stroke={COLORS[di % COLORS.length]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          })}
        </svg>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {cumData.map((d, i) => (
            <span key={d.name} className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {d.name}
            </span>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Ergebnis</p>
        {sorted.map((p, i) => (
          <div key={p.id} className="flex justify-between py-2 border-b border-stone-50 last:border-0 text-sm">
            <span>{i + 1}. {p.name}{i === 0 ? ' 🏆' : ''}</span>
            <span className="font-bold">{g.totals[p.id]}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-danger btn-lg flex items-center justify-center gap-2" onClick={deleteGame}>
        <Trash2 size={16} /> Spiel löschen
      </button>
    </div>
  )
}
