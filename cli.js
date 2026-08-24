#!/usr/bin/env node
/**
 * cli.js
 * Usage: node cli.js "Full Name"
 */

const { generateUsernames } = require('./usernameGenerator');
const { checkUsernameAcrossPlatforms } = require('./platformCheckers');

function statusIcon(status) {
  if (status === 'available') return '✅';
  if (status === 'taken') return '❌';
  return '❔'; // unknown / couldn't verify
}

async function main() {
  const fullName = process.argv.slice(2).join(' ').trim();
  if (!fullName) {
    console.error('Usage: node cli.js "Full Name"');
    process.exit(1);
  }

  const candidates = generateUsernames(fullName);
  console.log(`\nGenerated ${candidates.length} candidates for "${fullName}":\n`);

  for (const username of candidates) {
    console.log(`\n${username}`);
    console.log('-'.repeat(username.length));
    const results = await checkUsernameAcrossPlatforms(username);
    for (const r of results) {
      console.log(`  ${statusIcon(r.status)} ${r.platform.padEnd(14)} ${r.status.padEnd(10)} ${r.url}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
