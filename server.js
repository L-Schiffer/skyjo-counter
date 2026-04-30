const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(process.env.DB_DIR || "./data", "skyjo.db");

// ── DB Setup ──
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT DEFAULT (datetime('now')),
    finished_at TEXT,
    winner_id INTEGER REFERENCES players(id)
  );
  CREATE TABLE IF NOT EXISTS game_players (
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id),
    PRIMARY KEY (game_id, player_id)
  );
  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    ender_id INTEGER REFERENCES players(id),
    doubled INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS round_scores (
    round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id),
    score INTEGER NOT NULL,
    PRIMARY KEY (round_id, player_id)
  );
`);

// Seed admin user
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "changeme123";
const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(ADMIN_USER);
if (!existing) {
  const hash = bcrypt.hashSync(ADMIN_PASS, 10);
  db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)").run(ADMIN_USER, hash);
  console.log(`Admin user '${ADMIN_USER}' created.`);
}

// ── Middleware ──
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "skyjo-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax" }
}));

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: "Nicht eingeloggt" });
}
function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(403).json({ error: "Kein Admin" });
}

// ── Auth Routes ──
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Ungültige Anmeldedaten" });
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.isAdmin = !!user.is_admin;
  res.json({ username: user.username, isAdmin: !!user.is_admin });
});
app.post("/api/logout", (req, res) => { req.session.destroy(); res.json({ ok: true }); });
app.get("/api/me", (req, res) => {
  if (!req.session?.userId) return res.json(null);
  res.json({ username: req.session.username, isAdmin: req.session.isAdmin });
});

// ── User Management (admin only) ──
app.get("/api/users", requireAuth, requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT id, username, is_admin, created_at FROM users ORDER BY id").all());
});
app.post("/api/users", requireAuth, requireAdmin, (req, res) => {
  const { username, password, isAdmin } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username und Passwort erforderlich" });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const r = db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)").run(username, hash, isAdmin ? 1 : 0);
    res.json({ id: r.lastInsertRowid, username, is_admin: isAdmin ? 1 : 0 });
  } catch (e) { res.status(409).json({ error: "Username existiert bereits" }); }
});
app.delete("/api/users/:id", requireAuth, requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.session.userId) return res.status(400).json({ error: "Eigenen Account nicht löschbar" });
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
app.put("/api/users/:id/password", requireAuth, requireAdmin, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Passwort erforderlich" });
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ ok: true });
});

// ── Player Management ──
app.get("/api/players", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM players ORDER BY name").all());
});
app.post("/api/players", requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name erforderlich" });
  try {
    const r = db.prepare("INSERT INTO players (name) VALUES (?)").run(name.trim());
    res.json({ id: r.lastInsertRowid, name: name.trim() });
  } catch (e) { res.status(409).json({ error: "Spieler existiert bereits" }); }
});
app.delete("/api/players/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM players WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Game CRUD ──
app.get("/api/games", requireAuth, (req, res) => {
  const games = db.prepare("SELECT * FROM games ORDER BY id DESC").all();
  const result = games.map(g => {
    const players = db.prepare("SELECT p.* FROM players p JOIN game_players gp ON p.id = gp.player_id WHERE gp.game_id = ?").all(g.id);
    const rounds = db.prepare("SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number").all(g.id);
    const roundsData = rounds.map(r => {
      const scores = {};
      db.prepare("SELECT * FROM round_scores WHERE round_id = ?").all(r.id).forEach(s => scores[s.player_id] = s.score);
      return { id: r.id, roundNumber: r.round_number, enderId: r.ender_id, doubled: !!r.doubled, scores };
    });
    const totals = {};
    players.forEach(p => { totals[p.id] = roundsData.reduce((s, r) => s + (r.scores[p.id] || 0), 0); });
    const winner = g.winner_id ? players.find(p => p.id === g.winner_id) : null;
    return { ...g, players, rounds: roundsData, totals, winner: winner?.name || null };
  });
  res.json(result);
});

app.post("/api/games", requireAuth, (req, res) => {
  const { playerIds } = req.body;
  if (!playerIds || playerIds.length < 2) return res.status(400).json({ error: "Min. 2 Spieler" });
  const g = db.prepare("INSERT INTO games DEFAULT VALUES").run();
  const ins = db.prepare("INSERT INTO game_players (game_id, player_id) VALUES (?, ?)");
  playerIds.forEach(pid => ins.run(g.lastInsertRowid, pid));
  res.json({ id: g.lastInsertRowid });
});

app.post("/api/games/:id/rounds", requireAuth, (req, res) => {
  const { scores, enderId } = req.body; // scores: {playerId: number}
  const gameId = Number(req.params.id);
  const last = db.prepare("SELECT MAX(round_number) as n FROM rounds WHERE game_id = ?").get(gameId);
  const roundNum = (last?.n || 0) + 1;

  const raw = {};
  Object.entries(scores).forEach(([pid, val]) => raw[Number(pid)] = Number(val));
  const min = Math.min(...Object.values(raw));
  const alone = raw[enderId] === min && Object.values(raw).filter(v => v === min).length === 1;
  const dbl = !alone && raw[enderId] > 0;
  if (dbl) raw[enderId] = raw[enderId] * 2;

  const r = db.prepare("INSERT INTO rounds (game_id, round_number, ender_id, doubled) VALUES (?, ?, ?, ?)").run(gameId, roundNum, enderId, dbl ? 1 : 0);
  const ins = db.prepare("INSERT INTO round_scores (round_id, player_id, score) VALUES (?, ?, ?)");
  Object.entries(raw).forEach(([pid, score]) => ins.run(r.lastInsertRowid, Number(pid), score));
  res.json({ roundId: r.lastInsertRowid, doubled: dbl, scores: raw });
});

app.post("/api/games/:id/finish", requireAuth, (req, res) => {
  const { winnerId } = req.body;
  db.prepare("UPDATE games SET finished_at = datetime('now'), winner_id = ? WHERE id = ?").run(winnerId, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/games/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM round_scores WHERE round_id IN (SELECT id FROM rounds WHERE game_id = ?)").run(req.params.id);
  db.prepare("DELETE FROM rounds WHERE game_id = ?").run(req.params.id);
  db.prepare("DELETE FROM game_players WHERE game_id = ?").run(req.params.id);
  db.prepare("DELETE FROM games WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Static Files ──
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`Skyjo running on :${PORT}`));
