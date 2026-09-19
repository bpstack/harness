// The calculation behind `uninstall`. No disk, no process: pure functions of
// the text they are given, so what it would remove can be shown before it is.
//
// 🔴 Why this exists at all: installing something you cannot remove turns a
// trial into a commitment. Everything here is the inverse of `propagate`, and
// it leans on the same two pieces — the marks, and the promise that nothing
// outside them is touched.

import { findBlock, unbalanced, FAMILIES } from './marks.mjs';

// What a project's file can need.
export const STRIPPED = 'stripped';
export const CLEAN = 'clean';

// 🔴 Removing a block is EASIER than writing one, and that is the whole point
// of the marks: writing has to decide where the block goes, removing only has
// to read two comments. The bytes outside them come out untouched by
// construction — nothing here ever looks at them.
//
// ⚠️ The one thing this cannot know: whether somebody edited **inside** the
// marks, against the instruction the marks themselves carry. That edit goes
// with the block, and no reading of the file can tell it from generated text.
// Which is why nothing is written without `--apply`, and the dry run prints
// what disappears.
export function stripBlocks(text) {
  // A file whose marks do not pair is refused here for the same reason
  // `propagate` refuses it (ADR-150): the span cannot be read one way only,
  // and guessing would delete the project's own prose.
  for (const family of FAMILIES) {
    const broken = unbalanced(text, family);
    if (broken) return { violation: broken, next: text, removed: [] };
  }

  let out = String(text);
  const removed = [];
  for (const family of FAMILIES) {
    let found;
    // A file may carry more than one block of a family over its lifetime.
    while ((found = findBlock(out, family))) {
      removed.push(family);
      const head = out.slice(0, found.start);
      const tail = out.slice(found.end);
      // The block sat on its own lines with a blank line either side. Removing
      // it would leave two blank lines where the project had one, so the seam
      // is closed — and **only the seam**: a project that deliberately keeps
      // three blank lines somewhere else keeps them.
      out = head.replace(/\n{2,}$/, '\n') + tail.replace(/^\n{2,}/, '\n');
    }
  }

  return {
    next: out.replace(/\s*$/, '\n'),
    removed,
    violation: null,
    action: removed.length ? STRIPPED : CLEAN,
  };
}
