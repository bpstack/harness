// Checks on **the material that ships**, not on the scripts that ship it.
//
// 🔴 The gap these close, ported from the private notebook on 2026-09-08 after
// reading what each of its content checks guaranteed and whether the guarantee
// still applies here: _«the engine is verified and the content is not»_. The
// generators carry over two hundred tests; `layer1.md`, the moulds, the agents
// and the commands — **what actually reaches another machine and another
// repo** — went through formatting and nothing else.
//

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(REPO, ...p), 'utf8');

// Everything that leaves this repo and is read somewhere else.
function whatShips() {
  const out = [['layer1.md', read('layer1.md')]];
  for (const dir of ['agents', 'commands', 'templates'])
    for (const file of readdirSync(join(REPO, dir)).filter((f) =>
      f.endsWith('.md'),
    ))
      out.push([`${dir}/${file}`, read(dir, file)]);
  return out;
}

const BASES = ['~/.claude/', '~/.config/opencode/'];

// ⚠️ The **whole path** is captured, not the bare folder name. The notebook's
// first version looked for `templates/` on its own and gave a false positive
// inside `~/.claude/reference/templates/`: what precedes `templates/` there is
// `reference/`, not the base. _Found by running it._
const GLOBAL_PATH = /[~\w./-]*\b(?:reference|templates)\//g;

// One line is exempt, and the exemption is narrow on purpose: it says where the
// sheet lives **inside this repo**, right after giving the deployed path in
// full. Exempting the file would let a real relative path in unnoticed, so the
// exact text is what is allowed.
const ABOUT_THIS_REPO = 'The harness ships that sheet in `reference/security/`';

test('🔴 no path to the shipped artefacts travels without its base', () => {
  for (const [file, text] of whatShips()) {
    for (const m of text.matchAll(GLOBAL_PATH)) {
      if (BASES.some((b) => m[0].startsWith(b))) continue;
      const line = text.split('\n').find((l) => l.includes(m[0])) ?? '';
      if (
        file === 'agents/security.md' &&
        ABOUT_THIS_REPO.includes(m[0].trim())
      )
        continue;
      assert.fail(
        `${file} cites \`${m[0]}\` with no base — in ${line.trim().slice(0, 60)}…\n` +
          'Read from another repo, a relative path has nothing to resolve ' +
          'against: write it in full, starting at `~/.claude/`.',
      );
    }
  }
});
