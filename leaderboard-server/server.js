// Tiny leaderboard API - no database, just a JSON file on disk.
//
// One entry per name (case-insensitive, trimmed) - it holds that player's
// personal best. A new submission only replaces it if the new score is
// higher; equal or lower scores are accepted (200 OK) but not saved, and
// any duplicate names already on disk are cleaned up automatically.
//
// Endpoints:
//   GET  /api/leaderboard        -> top N entries, sorted by score desc
//   POST /api/leaderboard        -> { name, score } - validates, keeps the
//                                    higher of (new score, existing best)
//   GET  /health                 -> { ok: true } (for Coolify/uptime checks)
//
// Configuration (all optional, via environment variables):
//   PORT            - port to listen on (default 3000)
//   DATA_DIR        - directory holding leaderboard.json (default ./data)
//                     Mount a persistent volume here in Coolify so scores
//                     survive redeploys/restarts.
//   ALLOWED_ORIGIN  - CORS origin allowed to call this API (default "*").
//                     Once the site is live, set this to the exact site
//                     origin, e.g. "https://yourdomain.com", to stop other
//                     sites from submitting/reading through your API.
//   MAX_ENTRIES     - how many entries to keep on disk (default 50)
//   TOP_N           - how many entries GET returns (default 10)
//   MIN_SUBMIT_INTERVAL_MS - minimum time between submissions from the
//                     same IP (default 5000). Basic spam guard only -
//                     with no accounts/auth, a determined visitor could
//                     still post fake scores. There is no way to fully
//                     prevent that without real authentication.

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const MAX_ENTRIES = parseInt(process.env.MAX_ENTRIES || '50', 10);
const TOP_N = parseInt(process.env.TOP_N || '10', 10);
const MIN_SUBMIT_INTERVAL_MS = parseInt(process.env.MIN_SUBMIT_INTERVAL_MS || '5000', 10);
const MAX_NAME_LENGTH = 15;
const MAX_SCORE = 1000000; // sanity ceiling - anything above this is rejected as bogus

app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGIN }));

// --- Storage helpers -------------------------------------------------

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}
ensureDataFile();

function readEntries() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read leaderboard file, starting fresh:', err.message);
    return [];
  }
}

// One name = one entry (its personal best). Names are matched trimmed and
// case-insensitively, so "Denis" and "denis" collapse to the same player.
// Sorted descending by score.
function dedupeKeepBest(entries) {
  const bestByName = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.name !== 'string' || typeof entry.score !== 'number') continue;
    const key = entry.name.trim().toLowerCase();
    const existing = bestByName.get(key);
    if (!existing || entry.score > existing.score) {
      bestByName.set(key, entry);
    }
  }
  return Array.from(bestByName.values()).sort((a, b) => b.score - a.score);
}

// Serialize writes through a single promise chain so two near-simultaneous
// submissions can't race and clobber each other's data.
let writeChain = Promise.resolve();
function writeEntries(entries) {
  writeChain = writeChain.then(
    () => fs.promises.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8')
  );
  return writeChain;
}

// One-time cleanup on boot: if the file already has duplicate names (from
// before this rule existed, or from any external edit), collapse them down
// to one best-score entry per name and persist that immediately.
(function migrateExistingDuplicates() {
  const current = readEntries();
  const deduped = dedupeKeepBest(current);
  if (deduped.length !== current.length) {
    writeEntries(deduped)
      .then(() => console.log(`Startup cleanup: removed ${current.length - deduped.length} duplicate name entr${current.length - deduped.length === 1 ? 'y' : 'ies'}.`))
      .catch((err) => console.error('Startup dedupe cleanup failed:', err.message));
  }
})();

// --- Extremely small in-memory rate limiter ---------------------------
// Per-IP, in-process only (resets on restart, not shared across multiple
// server instances). Good enough to stop a script mashing the button; not
// a real anti-abuse system.
const lastSubmitByIp = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const last = lastSubmitByIp.get(ip) || 0;
  if (now - last < MIN_SUBMIT_INTERVAL_MS) return true;
  lastSubmitByIp.set(ip, now);
  return false;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// --- Routes -------------------------------------------------------------

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.type('text/plain').send('Visarun leaderboard API is running. See /api/leaderboard.');
});

app.get('/api/leaderboard', (req, res) => {
  const top = dedupeKeepBest(readEntries()).slice(0, TOP_N);
  res.json(top);
});

app.post('/api/leaderboard', async (req, res) => {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many submissions - please wait a moment and try again.' });
  }

  const body = req.body || {};
  let { name, score } = body;

  if (typeof name !== 'string' || typeof score !== 'number') {
    return res.status(400).json({ error: 'Expected { name: string, score: number }.' });
  }

  name = name.trim().slice(0, MAX_NAME_LENGTH);
  if (name.length === 0) {
    name = 'Anonymous';
  }

  score = Math.floor(score);
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return res.status(400).json({ error: 'Score out of range.' });
  }

  // Collapse any pre-existing duplicates first, then look for this name
  // (case-insensitive, trimmed) among the clean set.
  const deduped = dedupeKeepBest(readEntries());
  const key = name.toLowerCase();
  const existingIndex = deduped.findIndex((e) => e.name.trim().toLowerCase() === key);

  let saved;
  let bestScore = score;

  if (existingIndex === -1) {
    // New name - always saved.
    deduped.push({ name, score, date: new Date().toISOString() });
    saved = true;
  } else if (score > deduped[existingIndex].score) {
    // Beat their own previous best - replace it.
    deduped[existingIndex] = { name, score, date: new Date().toISOString() };
    saved = true;
  } else {
    // Existing score for this name is already equal or higher - don't
    // create a duplicate entry, leave the leaderboard as-is.
    saved = false;
    bestScore = deduped[existingIndex].score;
  }

  deduped.sort((a, b) => b.score - a.score);
  const trimmed = deduped.slice(0, MAX_ENTRIES);

  try {
    // Persist even when this particular submission wasn't saved, so any
    // cleanup from dedupeKeepBest() above still lands on disk.
    await writeEntries(trimmed);
  } catch (err) {
    console.error('Failed to persist leaderboard:', err.message);
    return res.status(500).json({ error: 'Could not save score, please try again.' });
  }

  res.json({
    success: saved,
    bestScore: bestScore,
    message: saved ? null : 'A better or equal score already exists for this name.',
    top: trimmed.slice(0, TOP_N)
  });
});

app.listen(PORT, () => {
  console.log(`Leaderboard server listening on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Allowed origin: ${ALLOWED_ORIGIN}`);
});
