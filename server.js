/**
 * server.js
 * Small Express API around the username generator + checker.
 *
 * POST /check   { "fullName": "Adifagbade Samuel Tomiwa" }
 *   -> { fullName, results: [ { username, checks: [...] }, ... ] }
 *
 * GET /health
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const { generateUsernames } = require("./usernameGenerator");
const { checkUsernameAcrossPlatforms } = require("./platformCheckers");

const app = express();
app.use(cors()); // allow requests from any frontend origin; tighten in production
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serves public/index.html at "/"

app.get("/health", (req, res) => res.json({ ok: true }));

// Fast, no network calls — just the candidate list, for instant UI feedback.
app.post("/generate", (req, res) => {
  const { fullName, maxSuggestions } = req.body || {};
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return res
      .status(400)
      .json({ error: "fullName is required (string, non-empty)" });
  }
  const candidates = generateUsernames(fullName, { maxSuggestions });
  res.json({ fullName, candidates });
});

// Check a single username. Lets the frontend fire one request per candidate
// in parallel and update each card as its own result comes in, rather than
// waiting for every candidate x every platform to finish.
app.get("/check-one", async (req, res) => {
  const { username } = req.query;
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "username query param is required" });
  }
  try {
    const checks = await checkUsernameAcrossPlatforms(username);
    res.json({ username, checks });
  } catch (err) {
    res
      .status(500)
      .json({
        error: "Internal error checking username",
        details: err.message,
      });
  }
});

app.post("/check", async (req, res) => {
  const { fullName, maxSuggestions } = req.body || {};

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return res
      .status(400)
      .json({ error: "fullName is required (string, non-empty)" });
  }

  const candidates = generateUsernames(fullName, { maxSuggestions });

  try {
    const results = await Promise.all(
      candidates.map(async (username) => ({
        username,
        checks: await checkUsernameAcrossPlatforms(username),
      })),
    );
    res.json({ fullName, count: results.length, results });
  } catch (err) {
    res
      .status(500)
      .json({
        error: "Internal error checking usernames",
        details: err.message,
      });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Username tool API listening on http://localhost:${PORT}`),
);

module.exports = app;
