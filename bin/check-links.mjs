#!/usr/bin/env node
// Checks every relative link in the repo's Markdown: that the file exists,
// **with the exact case**, and that the anchor it points at is real.
//
//   node bin/check-links.mjs
//
// 🔴 The case check is the reason this is not a one-liner. On Windows and
// macOS a link with the wrong case passes; on Linux — where the CI runs — it is
// broken. A green obtained on one operating system says nothing about another.
//
// ⚠️ And the path is split on both separators. Splitting only on `/` made an
// earlier version of this idea report 109 correct links as broken on Windows,
// where `path.relative` returns `\`.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { anchorsIn, linksIn, wrongCase } from '../lib/links.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'coverage',
  '_archive',
  '.local',
]);

function markdown(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) markdown(full, out);
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

// Every segment of the path is checked against the real directory listing, so
// a wrong case is caught even where the filesystem does not care.
export function resolveWithCase(from, target) {
  const full = resolve(dirname(from), target);
  const rel = relative(REPO, full);
  if (rel.startsWith('..')) return { ok: true, outside: true };

  let current = REPO;
  for (const segment of rel.split(sep)) {
    if (!segment || segment === '.') continue;
    const siblings = existsSync(current) ? readdirSync(current) : [];
    if (!siblings.includes(segment)) {
      const real = wrongCase(segment, siblings);
      return real
        ? { ok: false, why: `wrong case: "${segment}" is really "${real}"` }
        : { ok: false, why: `no such file: ${segment}` };
    }
    current = join(current, segment);
  }
  return { ok: true, path: current };
}

export function check(files) {
  const problems = [];
  let links = 0;
  let anchors = 0;

  for (const { path, text } of files) {
    for (const link of linksIn(text)) {
      links++;
      const found = resolveWithCase(path, link.path);
      if (!found.ok) {
        problems.push(`${rel(path)} → ${link.raw}: ${found.why}`);
        continue;
      }
      if (found.outside || !link.anchor) continue;

      anchors++;
      const target = readFileSync(found.path, 'utf8');
      if (!anchorsIn(target).includes(link.anchor)) {
        problems.push(
          `${rel(path)} → ${link.raw}: no heading gives the anchor "${link.anchor}"`,
        );
      }
    }
  }
  return { problems, links, anchors };
}

const rel = (p) => relative(REPO, p).split(sep).join('/');

if (process.argv[1] && process.argv[1].endsWith('check-links.mjs')) {
  const files = markdown(REPO).map((path) => ({
    path,
    text: readFileSync(path, 'utf8'),
  }));

  const { problems, links, anchors } = check(files);
  if (!problems.length) {
    console.log(
      `OK: ${files.length} markdown files, ${links} relative links and ` +
        `${anchors} anchors checked, none broken.`,
    );
    process.exit(0);
  }
  console.log(`✖ ${problems.length} broken link(s):`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
