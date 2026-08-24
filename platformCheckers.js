/**
 * platformCheckers.js
 *
 * Checks whether a username appears to be taken on a set of platforms.
 *
 * Two strategies are used:
 *  1. API-based (reliable): platforms with a public read endpoint that
 *     returns a clean 404/200 (currently: GitHub, npm).
 *  2. Profile-page probing (best-effort): fetch the public profile URL and
 *     infer status from the HTTP status code. Many platforms (Instagram,
 *     TikTok, X, etc.) actively fight this — expect "unknown" results for
 *     some of them. This mirrors how public username-checker sites work.
 *
 * Every checker returns: { platform, url, status } where status is one of
 * 'available' | 'taken' | 'unknown'.
 */

const fetch = require('node-fetch');

const TIMEOUT_MS = 6000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'manual' });
  } finally {
    clearTimeout(id);
  }
}

// ---- Strategy 1: API-based checks (most reliable) ----------------------

async function checkGithub(username) {
  const url = `https://api.github.com/users/${username}`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'username-availability-tool' },
    });
    if (res.status === 404) return { platform: 'GitHub', url: `https://github.com/${username}`, status: 'available' };
    if (res.status === 200) return { platform: 'GitHub', url: `https://github.com/${username}`, status: 'taken' };
    return { platform: 'GitHub', url: `https://github.com/${username}`, status: 'unknown' };
  } catch (e) {
    return { platform: 'GitHub', url: `https://github.com/${username}`, status: 'unknown' };
  }
}

async function checkNpm(username) {
  // npm doesn't have user profiles in the same sense, but org/package
  // namespaces are a reasonable proxy for a "handle".
  const url = `https://registry.npmjs.org/-/user/org.couchdb.user:${username}`;
  try {
    const res = await fetchWithTimeout(url);
    if (res.status === 404) return { platform: 'npm', url: `https://www.npmjs.com/~${username}`, status: 'available' };
    if (res.status === 200) return { platform: 'npm', url: `https://www.npmjs.com/~${username}`, status: 'taken' };
    return { platform: 'npm', url: `https://www.npmjs.com/~${username}`, status: 'unknown' };
  } catch (e) {
    return { platform: 'npm', url: `https://www.npmjs.com/~${username}`, status: 'unknown' };
  }
}

// ---- Strategy 2: profile-page probing (best-effort) ---------------------

function makeProbeChecker(platform, urlTemplate, opts = {}) {
  const { takenStatuses = [200], availableStatuses = [404] } = opts;
  return async function check(username) {
    const url = urlTemplate.replace('{username}', encodeURIComponent(username));
    try {
      const res = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; username-checker/1.0)' },
      });
      if (availableStatuses.includes(res.status)) return { platform, url, status: 'available' };
      if (takenStatuses.includes(res.status)) return { platform, url, status: 'taken' };
      return { platform, url, status: 'unknown' };
    } catch (e) {
      return { platform, url, status: 'unknown' };
    }
  };
}

const probeCheckers = [
  makeProbeChecker('Reddit', 'https://www.reddit.com/user/{username}/about.json'),
  makeProbeChecker('Twitch', 'https://www.twitch.tv/{username}'),
  makeProbeChecker('Instagram', 'https://www.instagram.com/{username}/'),
  makeProbeChecker('X (Twitter)', 'https://x.com/{username}'),
  makeProbeChecker('TikTok', 'https://www.tiktok.com/@{username}'),
  makeProbeChecker('YouTube', 'https://www.youtube.com/@{username}'),
  makeProbeChecker('Pinterest', 'https://www.pinterest.com/{username}/'),
  makeProbeChecker('Telegram', 'https://t.me/{username}'),
  makeProbeChecker('Medium', 'https://medium.com/@{username}'),
  makeProbeChecker('Dev.to', 'https://dev.to/{username}'),
];

const apiCheckers = [checkGithub, checkNpm];

/**
 * Runs every checker for a single username, in parallel.
 * @param {string} username
 * @returns {Promise<Array<{platform:string,url:string,status:string}>>}
 */
async function checkUsernameAcrossPlatforms(username) {
  const jobs = [
    ...apiCheckers.map((fn) => fn(username)),
    ...probeCheckers.map((fn) => fn(username)),
  ];
  return Promise.all(jobs);
}

module.exports = { checkUsernameAcrossPlatforms };
