// The calculation behind `propagate`. No disk, no process: everything here is
// a pure function of the text it is given, so the effects live in one place and
// can be dry-run without pretending.
//
// Copying instead of referencing is a deliberate trade: copies are not avoided,
// they are made visible and maintained from a single source. This is what pays
// that debt.

import {
  findBlock,
  replaceBlock,
  removeBlock,
  renderBlock,
  openMark,
  closeMark,
  FAMILIES,
  unbalanced,
} from './marks.mjs';

// What a file can need. `skip` is as much an outcome as the others: a pass
// where nothing changes must say so, not stay silent.
export const UPDATE = 'update';
export const GRAFT = 'graft';
export const SKIP = 'skip';

// Re-exported, not reimplemented: it lives next to the marks it assembles, and
// having it in two files is what let the graft and the update drift apart.
export { renderBlock };

// 🔴 The promise that makes a tool writing into someone else's repo
// acceptable: everything outside the marks comes out byte for byte identical.
// This replaces each known block with a placeholder so two versions of a file
// can be compared on their untouched parts alone.
export function outside(text) {
  let out = String(text);
  for (const family of FAMILIES) {
    let found;
    // A file may carry more than one block of a family over its lifetime.
    while ((found = findBlock(out, family))) {
      out = out.slice(0, found.start) + `⟦${family}⟧` + out.slice(found.end);
    }
  }
  return out;
}

// Where a graft goes when the file has no mark yet: at the top, so the agent
// reads the rules before the prose they govern (ADR-187). A leading `# title`
// stays first, as in a new file. The project text is kept whole below it.
function split(text) {
  const t = String(text);
  const at = t.match(/^# [^\n]*\n/)?.[0].length ?? 0;
  return { head: t.slice(0, at), rest: t.slice(at).trimStart() };
}

export function graft(text, family, body) {
  const { head, rest } = split(text);
  const block = renderBlock(family, body);
  return `${head}${head ? '\n' : ''}${block}\n${rest ? `\n${rest}` : ''}`;
}

// What would happen to one file, without touching it.
export function planFile(text, family, body) {
  const found = findBlock(text, family);
  const next = found
    ? replaceBlock(text, family, body)
    : graft(text, family, body);

  if (next === text) {
    return { action: SKIP, next, language: found?.language ?? null };
  }
  return {
    action: found ? UPDATE : GRAFT,
    next,
    language: found?.language ?? null,
    // A Spanish block being rewritten is the migration happening. Worth
    // reporting: it is how anyone knows the old language is going away.
    migrates: found?.language === 'es',
  };
}

// The check that runs on the real file before writing, not only in a test.
// Returns null when the change is safe, or a description of what moved.
//
// ⚠️ It has to know which action it is judging. An update must leave the
// outside byte for byte identical; a graft **adds** a block, so its outside
// gains one placeholder by definition. Judging both by the same rule called
// every graft a violation — which is how this was found.
export function violation(before, after, action = UPDATE) {
  if (action === GRAFT) {
    // The title stays first, the project text survives whole at the end, and
    // what sits between them is a block.
    const { head, rest } = split(before);
    const a = String(after);
    const middle = a.slice(head.length, a.length - rest.length);
    if (a.startsWith(head) && a.endsWith(rest) && /^\s*<!--/.test(middle)) {
      return null;
    }
    return { at: head.length, before: head.slice(-40), after: a.slice(0, 40) };
  }

  const a = outside(before);
  const b = outside(after);
  if (a === b) return null;
  // Report the first divergence, so a human is pointed at a place, not handed
  // two files to diff by eye.
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return {
    at: i,
    before: a.slice(Math.max(0, i - 40), i + 40),
    after: b.slice(Math.max(0, i - 40), i + 40),
  };
}

// A whole run, as data. The caller does the reading and writing.
export function plan(files, family, body) {
  return files.map(({ path, text }) => {
    // 🔴 Before anything is planned. A file whose marks do not pair cannot be
    // read reliably, and `violation` cannot catch it because that check is
    // built on the same scanner — see `unbalanced` in `lib/marks.mjs` for the
    // measurement. Refusing is the only safe answer: this tool writes into
    // other people's repositories and cannot guess which opener they meant.
    const broken = unbalanced(text, family);
    if (broken) {
      return {
        path,
        action: SKIP,
        next: text,
        language: null,
        violation: broken,
      };
    }
    const result = planFile(text, family, body);
    return {
      path,
      ...result,
      violation: violation(text, result.next, result.action),
    };
  });
}

// ADR-190: a block whose source is gone — the stack layer 2 — is taken out
// whole. Marks that do not pair are refused, as everywhere else.
export function planRemoval(text, family) {
  const violation = unbalanced(text, family);
  const next = violation ? null : removeBlock(text, family);
  return { next: next ?? text, removed: next !== null, violation };
}

export function summarize(results) {
  const count = (a) =>
    results.filter((r) => r.action === a && !r.violation).length;
  return {
    update: count(UPDATE),
    graft: count(GRAFT),
    // ⚠️ A refusal carries `skip` as its action, because nothing happened to
    // the file — but counting it as "already current" says the opposite of
    // what took place. Every tally here excludes the refused.
    skip: count(SKIP),
    migrates: results.filter((r) => r.migrates).length,
    unsafe: results.filter((r) => r.violation).length,
  };
}
