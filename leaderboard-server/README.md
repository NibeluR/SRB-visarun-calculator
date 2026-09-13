# Visarun leaderboard API

A tiny Express server with no database - it just reads/writes a JSON file
(`data/leaderboard.json`) on disk. Built for the bonus mini-game on the
Serbia Visarun Calculator site.

## Endpoints

- `GET /api/leaderboard` - returns one page of entries, sorted by score
  descending: `{ "entries": [{ "name": "...", "score": 123, "date": "..." }, ...], "page": 1, "pageSize": 10, "total": 23 }`.
  Supports `?page=2&pageSize=10` to fetch entries 11-20, and so on -
  `total` tells the frontend how many pages exist.
- `POST /api/leaderboard` - body `{ "name": "...", "score": 123 }`, saves
  the entry and returns `{ success, bestScore, message, top }`. Rejected
  with `400` if the name is empty of letters (e.g. `"12345"`) or looks
  like a link (`http://...`, `www...`, or a bare domain like `foo.com`).
- `GET /health` - `{ "ok": true }`, for uptime checks.

## Running locally

```
npm install
npm start
```

Listens on port 3000 by default. Scores are saved to `./data/leaderboard.json`.

## Deploying on Coolify

1. Push this `leaderboard-server` folder to a git repo Coolify can reach
   (it can live as a subfolder of the same repo as the site - Coolify lets
   you set a base directory for the build).
2. In Coolify: **New Resource -> Application**, point it at the repo,
   set the **base directory** to `leaderboard-server` (or wherever you put
   it), and choose **Dockerfile** as the build pack. Coolify will pick up
   the `Dockerfile` in this folder automatically.
3. **Add a persistent volume**: mount it at `/app/data` inside the
   container. This is the important part - without it, the leaderboard
   resets to empty every time you redeploy or the container restarts.
4. **Environment variables** (Coolify -> your app -> Environment
   Variables):
   - `ALLOWED_ORIGIN` - set this to your site's exact origin once it's
     live, e.g. `https://serbiavisarun.com` (no trailing slash). This
     restricts which websites can call the API via CORS. Leave unset
     (defaults to `*`) only while testing.
   - `MAX_ENTRIES` - how many scores to keep on disk (default `100`).
   - `TOP_N` - default page size for GET requests that don't specify
     `pageSize` (default `10`).
   - `MIN_SUBMIT_INTERVAL_MS` - minimum ms between submissions from the
     same IP (default `5000`).
5. Expose the container's port `3000` and set up a domain/subdomain for
   it through Coolify (e.g. `leaderboard-api.yourdomain.com`) with
   Coolify's built-in HTTPS.
6. Once deployed, note the public base URL (e.g.
   `https://leaderboard-api.yourdomain.com`) - the game's frontend needs
   it in `LEADERBOARD_API_URL` (see the main site's `game/gamescript.js`).

## Known limitations (inherent to "no backend, no accounts")

- **No real anti-spam/anti-cheat.** The rate limiter is a simple
  in-memory per-IP cooldown; it stops accidental double-submits and
  casual spam, but anyone can still open dev tools and POST a fake high
  score directly - there is no way to verify a submitted score actually
  came from a real play-through without a much more involved
  authentication/anti-cheat system. Treat this as a fun, low-stakes
  leaderboard, not a competition with real stakes.
- **Single JSON file, no concurrency at scale.** Writes are serialized
  in-process, which is fine for a small hobby project's traffic. It
  isn't built to survive high concurrent write volume or running
  multiple server replicas at once (each replica would have its own
  file unless they share the same mounted volume).
- **In-memory rate limiter resets on restart** and isn't shared across
  multiple replicas, if you ever scale this beyond one container.
- **Name filtering is pattern-based, not a real URL parser.** It blocks
  the obvious cases (`http://`, `www.`, "word.com"-shaped names, and
  names with no letters at all), but a determined user could still slip
  something through, and a genuinely unlucky name that happens to look
  like a domain could get rejected. Good enough to stop casual spam
  links, not a guarantee.
