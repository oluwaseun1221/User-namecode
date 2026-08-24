# Username Generator + Availability Checker

Give it a full name, get back ranked username candidates, and see where each one
is available across 10+ platforms.

## Setup

```bash
npm install
```

## Usage

### CLI

```bash
node cli.js "Adifagbade Samuel Tomiwa"
```

Prints every generated candidate with a per-platform status:
- ✅ available
- ❌ taken
- ❔ unknown (platform blocked the check or timed out — verify manually)

### Frontend

A ready-made UI lives in `public/index.html` and is served automatically:

```bash
node server.js
```

Open `http://localhost:3000` — type a full name, hit Scan, and watch each
candidate's platform chips resolve live (available/taken/checking/unknown).

If you'd rather host the frontend separately from the API (e.g. deploy
`index.html` to Vercel/Netlify and the API elsewhere), open
`public/index.html`, set `API_BASE` near the top of the `<script>` block to
your API's URL, and serve the file from wherever you like. CORS is already
enabled on the server (`cors()` middleware in `server.js`) so cross-origin
requests will work — tighten the allowed origins before going to production.

### API

```bash
node server.js
```

Then:

```bash
curl -X POST http://localhost:3000/check \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Adifagbade Samuel Tomiwa"}'
```

There are three endpoints:
- `POST /generate` — `{ fullName }` → just the candidate list, no network calls (instant).
- `GET /check-one?username=x` — checks one username across all platforms.
- `POST /check` — does both at once: `{ fullName }` → every candidate, fully checked.

The bundled frontend calls `/generate` then fires `/check-one` per candidate in
parallel, so results appear progressively instead of one long wait.

Response shape:

```json
{
  "fullName": "Adifagbade Samuel Tomiwa",
  "count": 16,
  "results": [
    {
      "username": "adifagbadetomiwa",
      "checks": [
        { "platform": "GitHub", "url": "...", "status": "available" },
        { "platform": "Instagram", "url": "...", "status": "taken" }
      ]
    }
  ]
}
```

## How it works

**`usernameGenerator.js`** — pure logic, no network calls. Strips accents/punctuation,
then builds variants: `firstlast`, `first.last`, `first_last`, initials, and
numeric-suffix fallbacks (`name2026`, `name1`, etc.) in case everything clean
is taken.

**`platformCheckers.js`** — two strategies:

1. **API-based** (reliable): GitHub and npm both expose endpoints that return
   a clean 404 when a handle is free. Trust these results.
2. **Profile-page probing** (best-effort): for platforms without a public API
   (Instagram, X, TikTok, YouTube, Reddit, Twitch, Pinterest, Telegram, Medium,
   Dev.to), it fetches the public profile URL and infers status from the HTTP
   response code.

## Known limitations — read this before trusting "available"

- **Bot protection**: Instagram, TikTok, and X actively detect and block
  scraper-like traffic. Expect a meaningful chunk of `unknown` results on
  these, especially if you run many checks in a row from the same IP. This
  is not a bug — it's the same wall every "namechk"-style tool runs into.
- **Rate limits**: GitHub's public API allows ~60 unauthenticated
  requests/hour per IP. For heavier use, generate a
  [personal access token](https://github.com/settings/tokens) and add
  `Authorization: token YOUR_TOKEN` to the headers in `checkGithub()` —
  that raises the limit to 5,000/hour.
- **False confidence**: an `unknown` result means "couldn't verify," not
  "available." Always double-check manually before committing to a handle
  anywhere important (domain, business name, etc.).
- **ToS**: automated scraping of profile pages violates some platforms'
  terms of service if done at scale. This is fine for personal, low-volume
  use (checking a handful of names for yourself); don't turn it into a
  bulk-scraping service.

## Extending it

To add a new platform, drop another line into the `probeCheckers` array in
`platformCheckers.js`:

```js
makeProbeChecker('Threads', 'https://www.threads.net/@{username}'),
```

Tune `takenStatuses` / `availableStatuses` per platform if a site doesn't
follow the 200=taken / 404=available convention.
