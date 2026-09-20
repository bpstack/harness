// What the repo declares that the harness needs to know: its package manager,
// and whether this harness serves it.
//
// Stack detection lived here and is gone with the stack layer 2; command
// deduction went with the AGENTS template it filled.

// Which package manager the repo declares. Read, never assumed: the lockfile
// and `packageManager` are the two places that actually decide it.
export function detectPackageManager({ files = [], pkg = null } = {}) {
  const declared = pkg?.packageManager;
  if (declared)
    return { manager: declared.split('@')[0], evidence: 'packageManager' };
  if (files.includes('pnpm-lock.yaml'))
    return { manager: 'pnpm', evidence: 'pnpm-lock.yaml' };
  if (files.includes('yarn.lock'))
    return { manager: 'yarn', evidence: 'yarn.lock' };
  if (files.includes('package-lock.json'))
    return { manager: 'npm', evidence: 'package-lock.json' };
  return { manager: null, evidence: 'nothing declares one' };
}

// 🔴 **This harness serves pnpm projects and no others**, so the commands it
// writes are pnpm's. Layer 1 rule 10 is an invariant, not a preference, and a
// tool that hands you rules saying "pnpm, never npm" together with commands in
// npm is contradicting itself inside one file — which the project cannot even
// fix, since the rules sit between markers and get regenerated.
//
// A repo on another manager is turned away before it gets here, by
// `servesRepo` below. Writing another manager's syntax was tried and removed
// on 2026-09-06: accommodating what the rules forbid is worse than refusing.
export const MANAGER = 'pnpm';

// Whether this harness will scaffold this repo at all.
//
// **Only the declared manager decides**, and a repo that declares none is fine:
// nothing has been chosen yet, so nothing contradicts rule 10 — the harness is
// what chooses, and it chooses pnpm.
export function servesRepo({ manager = null } = {}) {
  if (manager === null || manager === MANAGER) return { serves: true };
  return {
    serves: false,
    manager,
    reason:
      `this repo declares ${manager}, and the harness only sets up ${MANAGER} ` +
      `projects. Layer 1 rule 10 is "pnpm, never npm": writing it into a ` +
      `${manager} repo hands the project a rule it breaks on every command, ` +
      `inside markers it cannot edit. Migrate the repo, or do not harness it.`,
  };
}
