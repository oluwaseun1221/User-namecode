/**
 * usernameGenerator.js
 * Turns a full name into a ranked list of candidate usernames.
 */

function normalize(part) {
  return part
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, '');       // strip anything not alphanumeric
}

/**
 * @param {string} fullName - e.g. "Adifagbade Samuel Tomiwa"
 * @param {object} opts
 * @param {number} opts.maxSuggestions - cap on numeric-suffix fallback candidates
 * @returns {string[]} ordered, deduplicated list of candidate usernames
 */
function generateUsernames(fullName, opts = {}) {
  const { maxSuggestions = 5 } = opts;

  const parts = fullName
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

  if (parts.length === 0) return [];

  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1); // anything between first/last, if present

  const candidates = new Set();

  // Single name (e.g. just "Tomiwa")
  if (parts.length === 1) {
    candidates.add(first);
  } else {
    candidates.add(first + last);
    candidates.add(last + first);
    candidates.add(`${first}.${last}`);
    candidates.add(`${first}_${last}`);
    candidates.add(first[0] + last);        // e.g. stomiwa
    candidates.add(first + last[0]);        // e.g. samuelt
    candidates.add(last + first[0]);
    candidates.add(first);
    candidates.add(last);

    if (middle.length > 0) {
      const m = middle[0];
      candidates.add(first + m + last);
      candidates.add(first[0] + m[0] + last);
      candidates.add(`${first}.${m}.${last}`);
    }
  }

  // Filter out anything too short/empty after normalization
  let list = [...candidates].filter((c) => c.length >= 2);

  // Numeric-suffix fallbacks appended after the "clean" ones, in case
  // every clean variant is taken on a given platform.
  const base = parts.length === 1 ? first : first + last;
  const currentYear = new Date().getFullYear();
  const fallbackSuffixes = [currentYear, currentYear % 100, 1, 01, 007];
  for (let i = 0; i < maxSuggestions && i < fallbackSuffixes.length; i++) {
    list.push(`${base}${fallbackSuffixes[i]}`);
  }

  // Dedup while preserving order
  return [...new Set(list)];
}

module.exports = { generateUsernames, normalize };
