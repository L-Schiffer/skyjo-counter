import { ArrowLeft } from 'lucide-react'
import { useApp } from '../App'
import { COLORS } from '../lib/constants'

export default function AnalyticsPage() {
  const { games, setView, setDetailGame } = useApp()
  const finished = games.filter(g => g.finished_at)

  if (!finished.length) return (
    <div className="max-w-md mx-auto px-4 pt-4">
      <button className="back-btn" onClick={() => setView('home')}><ArrowLeft size={16} /> Zurück</button>
      <div className="card text-center py-10 text-stone-400">Noch keine Spiele.</div>
    </div>
  )

  const ps = {}
  finished.forEach(g => {
    g.players.forEach(p => {
      if (!ps[p.name]) ps[p.name] = { wins: 0, games: 0, tp: 0, best: Infinity }
      ps[p.name].games++
      const t = g.totals[p.id] || 0
      ps[p.name].tp += t
      if (t < ps[p.name].best) ps[p.name].best = t
    })
    if (g.winner && ps[g.winner]) ps[g.winner].wins++
  })

  const lb = Object.entries(ps)
    .map(([n, s]) => ({ name: n, ...s, avg: Math.round(s.tp / s.games), wr: Math.round((s.wins / s.games) * 100) }))
    .sort((a, b) => b.wins - a.wins || a.avg - b.avg)

  const totalRounds = finished.reduce((s, g) => s + g.rounds.length, 0)
  const maxAvg = Math.max(...lb.map(p => p.avg), 1)

  const openDetail = (g) => { setDetailGame(g); setView('detail') }

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24">
      <button className="back-btn" onClick={() => setView('home')}><ArrowLeft size={16} /> Zurück</button>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-5">Statistiken</h1>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { val: finished.length, label: 'Spiele' },
          { val: totalRounds, label: 'Runden' },
          { val: lb.length, label: 'Spieler' },
        ].map(({ val, label }) => (
          <div key={label} className="card text-center py-4 mb-0">
            <div className="font-display text-2xl font-bold">{val}</div>
            <div className="text-xs text-stone-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="card">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">🏅 Bestenliste</p>
        {lb.map((p, i) => (
          <div key={p.name} className="flex items-center gap-3 py-3 border-b border-stone-50 last:border-0">
            <span className="text-base font-bold text-stone-200 w-6">{i + 1}</span>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{p.name}</div>
              <div className="text-xs text-stone-400">{p.wins}× gewonnen · Ø {p.avg} · Best {p.best} · {p.games} Spiele</div>
            </div>
            <span className="badge bg-emerald-50 text-emerald-700">{p.wr}%</span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">📊 Ø Punkte pro Spiel</p>
        <div className="flex items-end gap-2 h-36">
          {lb.map((p, i) => (
            <div key={p.name} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-stone-700">{p.avg}</span>
              <div
                className="w-full rounded-t-md min-h-1 transition-all"
                style={{ height: `${Math.max((p.avg / maxAvg) * 100, 4)}%`, background: COLORS[i % COLORS.length] }}
              />
              <span className="text-xs text-stone-400 truncate w-full text-center">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Game list */}
      <div className="card">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Alle Spiele</p>
        {finished.slice().reverse().map(g => (
          <button
            key={g.id}
            onClick={() => openDetail(g)}
            className="w-full flex items-center justify-between bg-stone-50 hover:bg-stone-100 px-4 py-3 rounded-xl mb-2 text-left transition-colors"
          >
            <div>
              <div className="font-medium text-sm">{new Date(g.started_at).toLocaleDateString('de-DE')} · {g.rounds.length} Runden</div>
              <div className="text-xs text-stone-400">{g.players.map(p => p.name).join(', ')}</div>
            </div>
            <span className="badge bg-amber-50 text-amber-700">🏆 {g.winner || '?'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
