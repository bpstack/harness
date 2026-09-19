// Leak guard: walks this repo looking for what must never be published, and
// **cuts `verify`**. It runs early rather than late on purpose — until it
// exists, the only thing keeping private material out of a public repo is that
// someone notices.
//
// 🔴 The list of private repo names is NOT in this file, and that is the whole
// design. This repo is the public one: shipping the names of the private park
// inside its own guard would publish exactly what the guard defends. So the
// names come from **outside** — `HARNESS_PRIVATE_NAMES` (comma separated) or a
// git-ignored `.private-names` file. With neither, the guard still runs its
// pattern checks and **says out loud that the name check was skipped**, because
// a silent partial pass is the failure mode this repo exists to avoid.
//
// ⚠️ Expect false positives on ordinary words. That is why names are matched on
// word boundaries and reported with their line, so a human can judge — never
// auto-fixed.
//
// 📌 **In CI the name half does not run, and that is a declared exception, not
// an oversight** — see `AGENTS.md` § Declared exceptions. A runner has no list,
// so the shape checks run and the skip is stated out loud. Passing the names in
// as a secret was considered and rejected on 2026-09-08: it would take them off
// the owner's machines, which is the one thing this file exists to prevent, and
// commits are made from machines that do have the list.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'coverage',
  '_archive',
  '.local',
]);

// Patterns that are private regardless of any external list.
export const PATTERNS = [
  {
    id: 'windows-path',
    // A drive letter followed by the users directory: an absolute path from a
    // developer machine. ⚠️ Deliberately not spelled out as an example here —
    // writing one would make this file trip its own guard, which is exactly
    // what happened the first time it ran.
    re: /[A-Za-z]:[\\/]Users[\\/]/,
    why: 'absolute Windows path from a developer machine',
  },
  {
    id: 'home-path',
    re: /\/home\/[a-z][a-z0-9_-]*\//,
    why: 'absolute Linux home path',
  },
  {
    id: 'private-repo',
    // The private notebook this harness was extracted from.
    re: /\bsetup\/(docs|findings|_archive)\b/,
    why: 'path inside the private notebook repo',
  },
];

export function readPrivateNames({ env = process.env, repo = REPO } = {}) {
  const fromEnv = (env.HARNESS_PRIVATE_NAMES ?? '').trim();
  if (fromEnv)
    return { names: split(fromEnv), source: 'HARNESS_PRIVATE_NAMES' };

  const file = join(repo, '.private-names');
  if (existsSync(file)) {
    return {
      names: split(readFileSync(file, 'utf8')),
      source: '.private-names',
    };
  }
  return { names: [], source: null };
}

// ⚠️ Comments are dropped **per line, before** splitting on commas. Splitting
// first tore a commented line apart and let everything after its first comma
// through as a name: a comment listing examples turned ordinary English words
// into private names, and the guard reported 113 leaks that were all its own
// bug. A parser that mangles its own config fails in the direction of noise,
// and noise is how a real hit gets ignored.
function split(raw) {
  return String(raw)
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .flatMap((line) => line.split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

// A name matches only on word boundaries: `widget` must not fire inside
// `widgetOf`. Names are matched case-insensitively.
export function nameHits(line, names) {
  const hits = [];
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^\\w-])${escaped}([^\\w-]|$)`, 'i').test(line)) {
      hits.push(name);
    }
  }
  return hits;
}

// An explicit, greppable escape hatch. A line carrying this marker is skipped —
// needed because this guard's own tests must contain example leaks to prove it
// fires. ⚠️ It is deliberately ugly and searchable: `grep -rn 'leak-guard:allow'`
// lists every exemption in the repo, so silencing a real leak with it cannot be
// done quietly.
export const ALLOW = 'leak-guard:allow';

export function scanText(text, names = []) {
  const found = [];
  text.split('\n').forEach((line, i) => {
    if (line.includes(ALLOW)) return;
    for (const p of PATTERNS) {
      if (p.re.test(line)) found.push({ line: i + 1, kind: p.id, why: p.why });
    }
    for (const name of nameHits(line, names)) {
      found.push({
        line: i + 1,
        kind: 'private-name',
        why: `private name '${name}'`,
      });
    }
  });
  return found;
}

export function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Only text files are read; anything else cannot leak prose.
const TEXT = /\.(md|mjs|js|json|yml|yaml|txt|ts)$/i;

export function report(findings, { source }) {
  const lines = [];
  if (!source) {
    lines.push(
      '⚠️  name check SKIPPED: no HARNESS_PRIVATE_NAMES and no .private-names.',
      '    Pattern checks ran; private repo names were NOT checked.',
    );
  } else {
    lines.push(`name list read from ${source}.`);
  }
  if (!findings.length) {
    lines.push('✔ no leak found.');
    return { text: lines.join('\n'), failed: false };
  }
  lines.push(`✖ ${findings.length} possible leak(s):`);
  for (const f of findings) {
    lines.push(`  · ${f.file}:${f.line} — ${f.why}`);
  }
  lines.push('', 'Each one is judged by a human. Nothing here is auto-fixed.');
  return { text: lines.join('\n'), failed: true };
}

if (process.argv[1] && process.argv[1].endsWith('leak-guard.mjs')) {
  const { names, source } = readPrivateNames();
  const findings = [];
  for (const file of walk(REPO)) {
    if (!TEXT.test(file)) continue;
    const rel = relative(REPO, file).split(sep).join('/');
    if (rel === '.private-names') continue;
    for (const hit of scanText(readFileSync(file, 'utf8'), names)) {
      findings.push({ ...hit, file: rel });
    }
  }
  const { text, failed } = report(findings, { source });
  console.log(text);
  process.exit(failed ? 1 : 0);
}
