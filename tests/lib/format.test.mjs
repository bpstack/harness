// The formatter that uses the destination's format. The pure function is tested
// against temporary folders carrying their own config: standing up a whole repo
// to check a line width would be a slow test that says no more.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatterFor } from '../../lib/format.mjs';

const LONG =
  'A deliberately long sentence that at eighty columns wraps onto two lines ' +
  'and at a hundred and twenty does not, which is exactly the difference.\n';

const repoWith = (config) => {
  const dir = mkdtempSync(join(tmpdir(), 'fmt-'));
  if (config) writeFileSync(join(dir, '.prettierrc'), JSON.stringify(config));
  return dir;
};

test('no declared config returns the text untouched, and says so', async () => {
  // 🔴 `hadConfig: false` is not a failure: it means "the destination declares
  // nothing, so Prettier would apply its defaults, which are ours". The caller
  // skips the work, which is why it has to be distinguishable from an error.
  const { format, hadConfig } = await formatterFor(
    join(repoWith(null), 'AGENTS.md'),
  );
  assert.equal(hadConfig, false);
  assert.equal(await format(LONG), LONG);
});

test("the destination's width is used, not this repo's", async () => {
  const dir = repoWith({ printWidth: 120, proseWrap: 'always' });
  const { format, hadConfig } = await formatterFor(join(dir, 'AGENTS.md'));
  assert.equal(hadConfig, true);
  const widths = (await format(LONG))
    .trim()
    .split('\n')
    .map((l) => l.length);
  assert.ok(Math.max(...widths) > 80, 'at 120 columns it must not wrap at 80');
  assert.ok(Math.max(...widths) <= 120);
});

test('🔴 the same text in two destinations comes out differently', async () => {
  // This is the whole point: one source, each repo's own format.
  const lines = async (w) => {
    const dir = repoWith({ printWidth: w, proseWrap: 'always' });
    const { format } = await formatterFor(join(dir, 'AGENTS.md'));
    return (await format(LONG)).trim().split('\n').length;
  };
  assert.notEqual(await lines(60), await lines(120));
});

test('🔴 a config that cannot be applied warns ONCE and returns the original', async () => {
  const dir = repoWith({ plugins: ['./a-plugin-that-is-not-here.js'] });
  const failures = [];
  const { format } = await formatterFor(join(dir, 'AGENTS.md'), (why) =>
    failures.push(why),
  );

  assert.equal(await format(LONG), LONG, 'it always returns text');
  await format(LONG);
  await format(LONG);
  assert.equal(failures.length, 1, 'warning N times about it is noise');
});

test('the config is resolved by walking up, the way Prettier does', async () => {
  const dir = repoWith({ printWidth: 40, proseWrap: 'always' });
  const { hadConfig } = await formatterFor(join(dir, 'docs', 'deep', 'X.md'));
  assert.equal(hadConfig, true);
});

// ── The two paths agree ──────────────────────────────────────────────────────

test('🔴 a freshly written file does not report as pending on the next pass', async () => {
  // This is the defect that started all of this, in its second form: the first
  // write and the update computed the same block in two places and drifted by
  // one blank line, so a repo was "out of date" the moment it was created.
  const { execFileSync } = await import('node:child_process');
  const { dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { writeFileSync: write } = await import('node:fs');

  const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const dir = repoWith({ printWidth: 60, proseWrap: 'always' });
  write(join(dir, 'package.json'), '{"name":"x"}\n');

  const node = process.execPath;
  execFileSync(node, [join(repo, 'bin', 'init-project.mjs'), '--apply', dir]);
  const after = execFileSync(node, [
    join(repo, 'bin', 'propagate.mjs'),
    dir,
  ]).toString();

  assert.match(after, /already current/);
  assert.doesNotMatch(after, /1 to update/);
});
