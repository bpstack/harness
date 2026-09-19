// Format a block **with the format the destination repo declares**, not with
// this one's. It lives here and not inside a script because **both need it**:
// `propagate` when it updates a block, and the generator when it writes one for
// the first time. Having it twice is how two branches computing the same thing
// drift apart — and that already happened once: it was fixed on the update path
// and the graft was left out, so a freshly harnessed repo was born with its own
// `format:check` red.
//
// 🔴 **It formats the block, never the file.** Reformatting the whole file
// would touch what the project wrote by hand and break the promise everything
// here rests on: outside the marks, byte for byte identical.
//
// 🔴 **A failure cannot be silent.** The real case: a repo declaring its own
// Prettier plugin **cannot be formatted from here**, because the plugin lives in
// that repo. The block then goes with this repo's format — which is what
// happened before, so it is no worse — but if the project's own `format` reaches
// the file, its CI turns red and the owner would look for the cause in their
// repo.

import prettier from 'prettier';

/**
 * Returns `{ format, hadConfig }`. `format` is async and **always returns
 * text**: when it cannot format, it returns the original and calls `onFailure`
 * **once** — warning N times about the same plugin is noise.
 *
 * `hadConfig` false means **"the destination declares nothing"**, not "it
 * failed". With no config Prettier would apply its defaults, which are this
 * repo's: there is nothing to adapt and the caller can skip the work.
 */
export async function formatterFor(path, onFailure = () => {}) {
  let config = null;
  try {
    config = await prettier.resolveConfig(path, { editorconfig: true });
  } catch {
    /* an unreadable .prettierrc does not invalidate the operation */
  }
  if (!config) return { format: async (t) => t, hadConfig: false };

  const options = { ...config, parser: 'markdown' };
  let warned = false;
  const format = async (text) => {
    try {
      return await prettier.format(text, options);
    } catch (e) {
      if (!warned) {
        warned = true;
        onFailure(e.code ?? e.message);
      }
      return text;
    }
  };
  return { format, hadConfig: true };
}
