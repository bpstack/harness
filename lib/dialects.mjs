// One neutral source, two harnesses. The body is shared; only the frontmatter
// differs, and it is composed here rather than maintained twice.
//
// 🔴 The source is in **neither** dialect on purpose. If it were written in one
// harness's format, the other would be a second-class citizen translated as an
// afterthought — and the one that drifts is always the one nobody looks at.

const FENCE = /^---\n([\s\S]*?)\n---\n?/;

export class SourceError extends Error {}

// A deliberately small frontmatter reader: `key: value`, plus `- item` lists
// under a key. Enough for what these files declare, and it fails loudly on
// anything else rather than guessing.
export function parseSource(text, file = 'source') {
  const m = FENCE.exec(String(text));
  if (!m) throw new SourceError(`${file}: no frontmatter`);

  const front = {};
  let listKey = null;
  let lastKey = null;
  // A key with nothing after the colon cannot be classified yet: the next line
  // decides. `- item` makes it a list; indented text makes it a wrapped value.
  let pendingKey = null;

  for (const raw of m[1].split('\n')) {
    if (!raw.trim()) continue;
    const item = /^\s*-\s+(.*)$/.exec(raw);
    if (item) {
      if (pendingKey) {
        front[pendingKey] = [];
        listKey = pendingKey;
        pendingKey = null;
      }
      if (!listKey) throw new SourceError(`${file}: list item with no key`);
      front[listKey].push(item[1].trim());
      lastKey = null;
      continue;
    }
    if (pendingKey && /^\s+\S/.test(raw)) {
      front[pendingKey] = raw.trim();
      lastKey = pendingKey;
      listKey = null;
      pendingKey = null;
      continue;
    }
    const pair = /^([a-z][a-z0-9-]*):\s*(.*)$/i.exec(raw);
    if (!pair) {
      // ⚠️ An indented line after a key is that key's value continuing. This
      // is not a nicety: Prettier reflows long frontmatter values onto a second
      // line, so the repo's own formatter produced files this parser refused.
      // The reader has to survive what the writer does to its own sources.
      if (lastKey && /^\s+\S/.test(raw)) {
        front[lastKey] = `${front[lastKey]} ${raw.trim()}`.trim();
        continue;
      }
      throw new SourceError(`${file}: cannot read "${raw.trim()}"`);
    }
    const [, key, value] = pair;
    if (pendingKey) {
      // Nothing followed it: an empty key is an empty list.
      front[pendingKey] = [];
      pendingKey = null;
    }
    if (value === '') {
      pendingKey = key;
      listKey = null;
      lastKey = null;
    } else {
      listKey = null;
      lastKey = key;
      front[key] = value.trim();
    }
  }
  if (pendingKey) front[pendingKey] = [];
  return { front, body: String(text).slice(m[0].length).trimStart() };
}

export function requireField(front, key, file) {
  const value = front[key];
  if (!value) throw new SourceError(`${file}: missing "${key}"`);
  return value;
}

const list = (v) => (Array.isArray(v) ? v : []);
const tools = (front) =>
  String(front.tools ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

const WRITES = ['edit', 'write'];
const canWrite = (t) => t.some((x) => WRITES.includes(x));

// Proof that a deployed file is ours, so the installer may delete it later. In
// the body and not the frontmatter: opencode forwards unknown frontmatter keys
// to the model provider (ADR-194).
export const MARK = '<!-- generated-by: harness -->';

function frontmatter(lines, body) {
  return `---\n${lines.join('\n')}\n---\n\n${MARK}\n\n${body}`;
}

// ── Claude Code ──────────────────────────────────────────────────────────────

const CLAUDE_TOOL = {
  bash: 'Bash',
  glob: 'Glob',
  grep: 'Grep',
  read: 'Read',
  edit: 'Edit',
  write: 'Write',
};

export function forClaude(front, body, file = 'source') {
  const name = requireField(front, 'name', file);
  const kind = front.kind ?? 'agent';
  const description = requireField(front, 'description', file);

  // 🔴 Agents and commands are not the same shape here. An agent declares
  // `name` and `tools`; a command takes its name from its filename and spells
  // the field `allowed-tools`. Writing the agent shape into a command file was
  // caught by comparing against the copies the previous tool wrote — no test
  // would have known which spelling the tool expects.
  const head =
    kind === 'agent'
      ? [`name: ${name}`, `description: ${description}`]
      : [`description: ${description}`];

  const allow = list(front['bash-allow']);
  const mapped = [
    ...new Set(
      tools(front)
        .map((t) => CLAUDE_TOOL[t])
        .filter(Boolean),
    ),
  ];
  // ADR-176: a command's `allowed-tools` takes patterns, so its bash is scoped
  // the way opencode scopes it. A subagent's `tools` does not (ADR-177).
  const scoped =
    kind === 'agent' || !allow.length
      ? mapped
      : mapped.flatMap((t) => {
          if (t !== 'Bash') return [t];
          // `)` or `,` would end a pattern early and widen what it allows.
          const bad = allow.find((p) => /[(),]/.test(p));
          if (bad)
            throw new SourceError(`${file}: bash-allow pattern "${bad}"`);
          return allow.map((p) => `Bash(${p})`);
        });
  if (scoped.length) {
    head.push(
      `${kind === 'agent' ? 'tools' : 'allowed-tools'}: ${scoped.join(', ')}`,
    );
  }

  const warnings = [];
  // 🔴 Said out loud rather than dropped quietly. For a subagent the allow-list
  // is real protection in the other harness and does not exist here, so a
  // reader of this file must not assume the restriction travelled with it.
  if (kind === 'agent' && allow.length) {
    warnings.push(
      `${name}: the bash allow-list does not travel to Claude Code — ` +
        'it declares tool names only, so bash is unrestricted there.',
    );
  }
  return { content: frontmatter(head, body), warnings };
}

// ── opencode ─────────────────────────────────────────────────────────────────

export function forOpencode(front, body, file = 'source') {
  const name = requireField(front, 'name', file);
  const kind = front.kind ?? 'agent';
  const t = tools(front);
  const head = [
    `name: ${name}`,
    `description: ${requireField(front, 'description', file)}`,
  ];

  if (kind === 'agent') {
    head.push('mode: subagent');
    if (front.temperature) head.push(`temperature: ${front.temperature}`);
    head.push('permission:', `  edit: ${canWrite(t) ? 'allow' : 'deny'}`);

    const allow = list(front['bash-allow']);
    // 🔴 Omitting the block when there is no bash left it **allowed** — the
    // opposite of what the source declares. Absence of a permission is not a
    // denial, so the denial is written.
    if (!t.includes('bash')) {
      head.push('  bash:', "    '*': deny");
    } else if (allow.length) {
      head.push('  bash:', "    '*': deny");
      for (const pattern of allow) head.push(`    '${pattern}': allow`);
    }
  } else {
    head.push('agent: build');
    // A command that runs as a subtask says so, or it runs in the main
    // session and spends its context. Declared in the source and easy to
    // drop silently on the way out.
    if (String(front.subtask) === 'true') head.push('subtask: true');
    // opencode command frontmatter does not support `tools:` (only agents do),
    // so the source's tool list is intentionally not emitted here. The command
    // inherits the permissions of the named `agent`.
  }
  return { content: frontmatter(head, body), warnings: [] };
}

export const DIALECTS = { claude: forClaude, opencode: forOpencode };

// ── Which harnesses to write ─────────────────────────────────────────────────
//
// Claude Code is always there: installing this harness assumes it. opencode is
// optional, so it is written only where its own directory exists, or when asked
// for with `--opencode`. Writing it everywhere left stale configuration on
// machines that never had it (measured 2026-09-06).
export const OPENCODE_HOME = '.config/opencode';

export function chooseHarnesses({ opencode = false, forced = false } = {}) {
  if (forced) {
    return {
      targets: ['claude', 'opencode'],
      why: 'claude, and opencode as asked for',
    };
  }
  if (opencode) {
    return {
      targets: ['claude', 'opencode'],
      why: 'claude, and opencode found here',
    };
  }
  return {
    targets: ['claude'],
    why: 'claude only: no opencode found here (--opencode writes it anyway)',
  };
}
