#!/usr/bin/env node
// Keeps `reference/security/` in step with the OWASP ASVS source.
//
//   node bin/asvs-update.mjs            dry run: report, write nothing
//   node bin/asvs-update.mjs --apply    regenerate and stamp when changed
//   node bin/asvs-update.mjs --offline  rebuild from the local CSV only
//
// Needs the network for the first two: it reads the tag list of OWASP/ASVS
// and the CSV of the tag the README declares. That is why it is NOT in
// `verify` — a red that CI cannot fix is a red that gets ignored. What `verify`
// does check, offline, is that the shipped indexes are exactly what the shipped
// CSV generates (see `lib/asvs.test.mjs`).
//
// Three outcomes:
//   · up to date      — same normalized sha256 as the README. Nothing touched.
//   · changed         — same version, new content: regenerate the 17 indexes
//                       and stamp date, size, rows and sha in the README.
//   · newer version   — 🔴 reported, exit 1, never applied. A person decides.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

import {
  REPO,
  buildIndexes,
  decide,
  levelCounts,
  newerVersions,
  normalize,
  parseRequirements,
  readStamp,
  sha256,
  stampReadme,
  stampChecked,
} from '../lib/asvs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SECURITY = join(ROOT, 'reference', 'security');
const README = join(SECURITY, 'source', 'README.md');

// Headings whose official OWASP title contains a name the leak guard watches.
// The marker is emitted by the generator so a regeneration cannot lose it.
export const ALLOW = { 'V3.3': 'official OWASP section title' };

export async function formatted(path, text) {
  const options = (await prettier.resolveConfig(path)) ?? {};
  return prettier.format(text, { ...options, filepath: path });
}

// The 17 indexes as they should be on disk, formatted like the repo.
export async function renderIndexes(csvText, { version, tag }) {
  const requirements = parseRequirements(csvText);
  const raw = buildIndexes(requirements, { version, tag, allow: ALLOW });
  const out = new Map();
  for (const [file, text] of raw) {
    out.set(file, await formatted(join(SECURITY, file), text));
  }
  return { files: out, requirements };
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'harness-asvs' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

async function main(argv) {
  const apply = argv.includes('--apply');
  const offline = argv.includes('--offline');
  const readme = readFileSync(README, 'utf8');
  const stamp = readStamp(readme);
  for (const k of ['sha256', 'tag', 'file', 'url']) {
    if (!stamp[k]) throw new Error(`source/README.md does not declare ${k}`);
  }
  const localCsv = readFileSync(join(SECURITY, 'source', stamp.file), 'utf8');

  let csvText = localCsv;
  let newer = [];
  if (!offline) {
    const tags = JSON.parse(
      await fetchText(`https://api.github.com/repos/${REPO}/tags?per_page=100`),
    ).map((t) => t.name);
    newer = newerVersions(tags, stamp.tag);
    csvText = normalize(await fetchText(stamp.url));
  }

  const verdict = decide({ readmeSha: stamp.sha256, csvText, newer });
  if (offline) {
    console.log(`tag ${stamp.tag} · offline: rebuilding from the local CSV.`);
  } else {
    console.log(`tag ${stamp.tag} · ${verdict.text}`);
    // 🔴 A clean check leaves a trace. It used to return here and write
    // nothing, so the only days that moved the date were the days something
    // changed — and the field is named for the check, not for the change.
    // Nothing triggers this updater, so that line is the only thing that could
    // ever reveal a stale ASVS; a date that does not move when it should makes
    // any age built on it a lie. `--apply` is what records it: a check on its
    // own writes nothing, which is its contract.
    if (verdict.kind === 'current') {
      if (apply) {
        writeFileSync(
          README,
          stampChecked(
            readme,
            new Date().toISOString().slice(0, 10),
            'same sha256, nothing to regenerate',
          ),
          'utf8',
        );
        console.log('  ~ reference/security/source/README.md — date stamped.');
      } else {
        console.log('  Dry run: the check date is recorded with --apply.');
      }
      return verdict.exit;
    }
    if (verdict.kind !== 'changed') return verdict.exit;
  }

  const { files, requirements } = await renderIndexes(csvText, {
    version: stamp.tag,
    tag: stamp.tag,
  });
  let changed = 0;
  for (const [file, text] of files) {
    const path = join(SECURITY, file);
    // 🔴 Only "it is not there" means a new file. Every other reason a read
    // can fail — no permission, locked by something else, a directory in its
    // place, a bad sector — used to land in the same `null` and be reported as
    // `+ new` and then overwritten. Two causes, one indistinguishable outcome,
    // and a label that says the opposite of what happened. What goes on top is
    // the correct content, so nothing valuable is lost; what is lost is the
    // truth of the report, and this tool's whole job is being trustworthy
    // about a security standard.
    let current = null;
    try {
      current = readFileSync(path, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw new Error(
          `cannot read reference/security/${file} → ${e.code ?? e.message}. ` +
            `Refusing to overwrite a file this run could not read.`,
        );
      }
    }
    if (current === text) continue;
    changed++;
    console.log(`  ${current === null ? '+' : '~'} reference/security/${file}`);
    if (apply) writeFileSync(path, text, 'utf8');
  }
  if (!offline) {
    const date = new Date().toISOString().slice(0, 10);
    const next = stampReadme(readme, {
      date,
      size: Buffer.byteLength(csvText, 'utf8'),
      rows: requirements.length,
      levels: levelCounts(requirements),
      sha: sha256(csvText),
    });
    console.log('  ~ reference/security/source/README.md');
    if (apply) {
      writeFileSync(join(SECURITY, 'source', stamp.file), csvText, 'utf8');
      writeFileSync(README, next, 'utf8');
    }
  }
  console.log(
    `${changed} index file(s) differ.` +
      (apply ? ' Written.' : ' Dry run: nothing written. Add --apply.'),
  );
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('asvs-update.mjs')) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`✖ ${err.message}`);
      process.exit(2);
    },
  );
}
