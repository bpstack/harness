// Link checking, as pure functions. The disk work lives in check-links.mjs.
//
// 🔴 Case matters, and that is the whole reason this exists. A link written
// with the wrong case passes on Windows and macOS and is broken on Linux —
// where the CI runs. A check that only ever runs on one operating system only
// ever checks that operating system.

// Headings inside a fenced code block are not headings. Without stripping
// fences first, a `# comment` in a shell example becomes a valid anchor and a
// genuinely broken link passes.
export function withoutCode(text) {
  return String(text)
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

// GitHub's anchor rules: lowercase, strip anything that is not a letter,
// number, space or hyphen, then spaces to hyphens.
export function anchorOf(heading) {
  return String(heading)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N} \-_]/gu, '')
    .trim()
    .replace(/ +/g, '-');
}

export function anchorsIn(text) {
  return [...withoutCode(text).matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) =>
    anchorOf(m[1]),
  );
}

// Relative markdown links, with their optional anchor. Absolute URLs and
// mail links are somebody else's problem.
export function linksIn(text) {
  return [...withoutCode(text).matchAll(/\[[^\]]*\]\((\.{1,2}\/[^)\s]+)\)/g)]
    .map((m) => m[1])
    .map((raw) => {
      const [path, anchor] = raw.split('#');
      return { raw, path, anchor: anchor ?? null };
    });
}

// 🔴 The case check has to be explicit. On a case-insensitive filesystem
// `existsSync` says yes to the wrong spelling, so the real name is read from
// the directory and compared.
export function wrongCase(name, siblings) {
  if (siblings.includes(name)) return null;
  const hit = siblings.find((s) => s.toLowerCase() === name.toLowerCase());
  return hit ?? null;
}
