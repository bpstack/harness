// Pure logic of the ASVS updater: parse the official CSV, build the 17 chapter
// indexes, stamp the source README, and decide whether a newer OWASP version
// exists. No network, no disk — the command in `../asvs-update.mjs` does that.

import { createHash } from 'node:crypto';

export const REPO = 'OWASP/ASVS';
export const HEADER_FIELDS = [
  'chapter_id',
  'chapter_name',
  'section_id',
  'section_name',
  'req_id',
  'req_description',
  'L',
];

// 🔴 Hash the normalized text, not the bytes. OWASP's rolling "latest" build
// of the same CSV differs only in line endings; a byte hash would report a
// change that is not there, and a false alarm is how a real one gets ignored.
export const normalize = (text) => String(text).replace(/\r/g, '');
export const sha256 = (text) =>
  createHash('sha256').update(normalize(text), 'utf8').digest('hex');

// RFC 4180: quoted fields may hold commas, doubled quotes and newlines.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = normalize(text);
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// The CSV as requirement records, after checking it is the file we expect.
export function parseRequirements(text) {
  const [header, ...rows] = parseCsv(text);
  if (header.join(',') !== HEADER_FIELDS.join(',')) {
    throw new Error(
      `unexpected CSV header: ${header.join(',')} — expected ${HEADER_FIELDS.join(',')}`,
    );
  }
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(HEADER_FIELDS.map((k, i) => [k, r[i]])));
}

export const chapterFile = (chapterId) =>
  `asvs-v${String(chapterId.replace(/^V/, '')).padStart(2, '0')}.md`;

// One markdown index per chapter. `allow` maps a section id to the reason its
// official title must carry a `leak-guard:allow` marker — the guard watches
// names that happen to be ordinary English words in OWASP's headings.
export function buildIndexes(requirements, { version, tag, allow = {} }) {
  const chapters = new Map();
  for (const r of requirements) {
    if (!chapters.has(r.chapter_id)) chapters.set(r.chapter_id, []);
    chapters.get(r.chapter_id).push(r);
  }
  const out = new Map();
  for (const [chapterId, reqs] of chapters) {
    const name = reqs[0].chapter_name;
    const lines = [
      `# ASVS ${version} — ${chapterId} ${name}`,
      '',
      `> **Requirement index for chapter ${chapterId} — ${name}.** Every entry carries an id ready to cite (\`${version}-<chapter>.<section>.<req>\`), the level \`L\` at which it becomes mandatory — an L2 project meets L1 and L2 — and the official text, which is what gets cited (rule in \`asvs.md\` §5).`,
      '>',
      `> **OWASP Application Security Verification Standard ${version.replace(/^v/, '')}** (May 2025), © 2008-2025 The OWASP Foundation, licensed **CC BY-SA 4.0** — <https://creativecommons.org/licenses/by-sa/4.0/>. Adapted with attribution, shared alike. Source: the official CSV of tag \`${tag}\` — <https://github.com/${REPO}/tree/${tag}>. Generated from that source; do not edit by hand.`,
    ];
    let section = null;
    for (const r of reqs) {
      if (r.section_id !== section) {
        section = r.section_id;
        const mark = allow[section]
          ? ` <!-- leak-guard:allow: ${allow[section]} -->`
          : '';
        lines.push('', `## ${section} — ${r.section_name}${mark}`, '');
      }
      const id = `${version}-${r.req_id.replace(/^V/, '')}`;
      lines.push(`- **${id}** (L${r.L}) ${r.req_description}`);
    }
    out.set(chapterFile(chapterId), lines.join('\n') + '\n');
  }
  return out;
}

export function levelCounts(requirements) {
  const n = { L1: 0, L2: 0, L3: 0 };
  for (const r of requirements) n[`L${r.L}`] = (n[`L${r.L}`] ?? 0) + 1;
  return n;
}

// What the source README declares. It is the record the updater compares
// against, so it is parsed rather than trusted from a constant.
export function readStamp(readme) {
  const get = (re) => (readme.match(re) ?? [])[1] ?? null;
  return {
    sha256: get(/\*\*sha256:\*\* `([0-9a-f]{64})`/),
    tag: get(/\*\*Tag:\*\* `(v[\d.]+)`/),
    file: get(/\*\*File:\*\* `([^`]+)`/),
    url: get(/\*\*Exact URL:\*\*\s*<([^>]+)>/),
  };
}

// 105100 → "105 100" with a plain space. No locale: Node ICU emits U+202F, a
// narrow no-break space, and the README regex above would then not match.
export const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function stampReadme(readme, { date, size, rows, levels, sha }) {
  const out = readme
    .replace(
      /\*\*Downloaded:\*\* \d{4}-\d{2}-\d{2} · \*\*Size:\*\* [\d ]+ bytes · \*\*Rows:\*\* \d+\s+requirements \(\d+ L1, \d+ L2, \d+ L3\)/,
      `**Downloaded:** ${date} · **Size:** ${thousands(size)} bytes · **Rows:** ${rows}\n  requirements (${levels.L1} L1, ${levels.L2} L2, ${levels.L3} L3)`,
    )
    .replace(/\*\*sha256:\*\* `[0-9a-f]{64}`/, `**sha256:** \`${sha}\``)
    // 🔴 The note goes with the date. The pattern used to stop at the day, so
    // a run that regenerated **because the sha differed** left the previous
    // line ending in place: the file then read «2026-09-07 — same sha256,
    // nothing to regenerate» immediately after regenerating everything. A
    // stale half-line is worse than no note, because it reads as a statement
    // about today.
    .replace(
      /\*\*Checked against the tag:\*\* \d{4}-\d{2}-\d{2}[^\n]*/,
      `**Checked against the tag:** ${date} — regenerated from the tag`,
    );
  if (out === readme)
    throw new Error('README stamp not found: nothing replaced');
  return out;
}

// 🔴 A version change is never applied on its own. Ids already cited in
// earlier reports may vanish or change meaning between 5.0 and 5.1, and a
// silent update would break the traceability of everything written so far.
export const parseVersion = (tagName) => {
  const m = String(tagName).match(/^v(\d+)\.(\d+)\.(\d+)/);
  return m ? m.slice(1, 4).map(Number) : null;
};

export function newerVersions(tagNames, currentTag) {
  const cur = parseVersion(currentTag);
  if (!cur) throw new Error(`current tag is not a version: ${currentTag}`);
  const gt = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  const seen = new Set();
  return tagNames
    .map((t) => ({ tag: t, v: parseVersion(t) }))
    .filter(({ v }) => v && gt(v, cur) > 0)
    .filter(({ v }) => !seen.has(v.join('.')) && seen.add(v.join('.')))
    .map(({ tag }) => tag);
}

// The three answers the command can give, decided from data alone.
export function decide({ readmeSha, csvText, newer }) {
  if (newer.length) {
    return {
      kind: 'version',
      text:
        `🔴 OWASP has published a newer ASVS: ${newer.join(', ')}. ` +
        `This is not applied on its own — ids already cited may vanish or ` +
        `change meaning. Read the release notes and decide; then bump the tag ` +
        `and URL in source/README.md and run again.`,
      exit: 1,
    };
  }
  const sha = sha256(csvText);
  if (sha === readmeSha) {
    return {
      kind: 'current',
      text: 'up to date: same sha256 as the README.',
      exit: 0,
    };
  }
  return {
    kind: 'changed',
    text: `the CSV of the tag changed (sha256 ${sha.slice(0, 12)}… vs README ${String(readmeSha).slice(0, 12)}…): the 17 indexes are regenerated and the README stamped.`,
    exit: 0,
    sha,
  };
}

// 🔴 The date alone, for the days when nothing changed — which is nearly every
// day. Until 2026-09-07 the field was only written by `stampReadme`, which runs
// **only when the CSV differs**: a run that checked and found everything in
// order returned before reaching it and left no trace at all. The field is
// called "Checked against the tag" and recorded "last changed". The 2026-09-06
// value in it was typed by a person, not by this program.
//
// It matters beyond tidiness: nothing triggers this updater, so the only thing
// that could ever notice a stale ASVS is the age of this line — and an age is
// worthless when the line does not move on the days it should.
export function stampChecked(readme, date, note = '') {
  const out = readme.replace(
    /\*\*Checked against the tag:\*\* \d{4}-\d{2}-\d{2}[^\n]*/,
    `**Checked against the tag:** ${date}${note ? ` — ${note}` : ''}`,
  );
  if (out === readme) {
    throw new Error('README has no "Checked against the tag" line to stamp');
  }
  return out;
}

// How old the check is, in whole days, or null when the line is unreadable.
// Read from the README that is versioned in the repo, so this needs no network
// and no per-machine state: what OWASP has published is the same everywhere.
export function checkedAge(readme, today = new Date()) {
  const m = readme.match(
    /\*\*Checked against the tag:\*\* (\d{4}-\d{2}-\d{2})/,
  );
  if (!m) return null;
  const then = new Date(`${m[1]}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return null;
  const day = 24 * 60 * 60 * 1000;
  return {
    date: m[1],
    days: Math.floor(
      (Date.parse(today.toISOString().slice(0, 10)) - then) / day,
    ),
  };
}

// 🔴 180 days, and it cuts. Not invented: measured from OWASP's own release
// history on 2026-09-07 — v4.0.1 2019-03, v4.0.2 2020-10, v4.0.3 2021-10,
// v5.0.0 2025-05. Gaps of 20, 12 and 43 months, and **zero releases in the
// last twelve**. The shortest gap this standard has ever had is a year, so 180
// days guarantees at least two checks between any two possible releases while
// staying far from noise: a 30-day cap would fire twelve times a year to say
// nothing.
//
// ⚠️ The age is read offline, but clearing the red needs the network —
// `asvs:update --apply` downloads. At 180 days the chance of being stuck
// without a connection at the moment it fires is negligible; at 30 it would be
// a real nuisance, which is the second reason the number is high.
//
// This one **fails**, unlike the size notice: a stale standard is not a soft
// cap being overshot. The `security` agent is forbidden to invent requirements
// and is handed this sheet as its source of truth, so when the sheet ages the
// citations stay confident and stop being true.
export const CHECK_MAX_DAYS = 180;

export function staleNotice(seen, { max = CHECK_MAX_DAYS } = {}) {
  if (!seen) {
    return {
      text:
        '✖ source/README.md does not say when the ASVS was last checked. ' +
        'Run `pnpm run asvs:update` to record it.',
      cuts: true,
    };
  }
  if (seen.days <= max) {
    return {
      text: `ASVS checked ${seen.days} day(s) ago (${seen.date}), within ${max}.`,
      cuts: false,
    };
  }
  return {
    text:
      `✖ the ASVS was last checked ${seen.days} days ago (${seen.date}), over ` +
      `the ${max}-day cap. The sheet the security agent cites from may no ` +
      `longer be the standard. Run \`pnpm run asvs:update --apply\` — it needs ` +
      `the network, and it never applies a new version on its own.`,
    cuts: true,
  };
}
