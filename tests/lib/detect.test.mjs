import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPackageManager, servesRepo } from '../../lib/detect.mjs';

test('the package manager is read, never assumed', () => {
  assert.equal(
    detectPackageManager({ pkg: { packageManager: 'pnpm@10.34.1' } }).manager,
    'pnpm',
  );
  assert.equal(detectPackageManager({ files: ['yarn.lock'] }).manager, 'yarn');
  assert.equal(detectPackageManager({ files: [] }).manager, null);
});

// "pnpm, never npm" together with commands in npm contradicts itself, and the
// project cannot fix it — the rules sit between markers and get regenerated.
test('a repo on another manager is not served', () => {
  assert.equal(servesRepo({ manager: 'npm' }).serves, false);
  assert.equal(servesRepo({ manager: 'yarn' }).serves, false);
  assert.match(servesRepo({ manager: 'npm' }).reason, /only sets up pnpm/);
});

// A repo that declares nothing has chosen nothing, so it contradicts no rule:
// the harness is what chooses, and it chooses pnpm.
test('a repo that declares no manager is served', () => {
  assert.equal(servesRepo({ manager: null }).serves, true);
  assert.equal(servesRepo({ manager: 'pnpm' }).serves, true);
});

test('the refusal names the manager it found, not a generic complaint', () => {
  assert.match(servesRepo({ manager: 'bun' }).reason, /declares bun/);
});
