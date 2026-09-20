#!/usr/bin/env node
// Is the ASVS check old? Reads the date stamped in the versioned README, so it
// runs offline and in CI: what OWASP published is the same on every machine,
// unlike anything that depends on one person's folders.
//
//   node bin/asvs-age.mjs
//
// It cuts, and it runs on a schedule rather than in `verify`: it reddens
// because time passed, not because the repo changed. The reasoning
// for the number, and for cutting rather than warning, is on CHECK_MAX_DAYS in
// `lib/asvs.mjs`.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkedAge, staleNotice } from '../lib/asvs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const README = join(ROOT, 'reference', 'security', 'source', 'README.md');

const { text, cuts } = staleNotice(checkedAge(readFileSync(README, 'utf8')));
console.log(text);
process.exit(cuts ? 1 : 0);
