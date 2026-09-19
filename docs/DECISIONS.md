# DECISIONS — why things are the way they are

> **What it answers:** why it is like this. · **Who reads it:** whoever doubts a
> decision, deliberately — not every session. · **How it is pruned:** it is not.

> **Appended, never rewritten.** A decision that changes **is not edited**: a
> new one is written that revises it, and the old one is marked with a pointer
> to it. Knowing something was decided, and why it changed, is worth more than
> the final version alone.
>
> The **why** lives here; the current state lives in `SESSION.md`, if the
> project has one. 🔴 **Deliberately not linked:** that file is **not created
> with this one** — it is offered separately and the project may not want it —
> so a link would be born broken.

---

## ADR-001 — Layer 1 is a minimal, verifiable, numbered list

- **Status:** ✅ accepted
- **Date:** 2026-08-04
- **Decision:** The harness's layer 1 is a numbered list of invariant rules, not
  a table and not a checklist. A rule enters only if it answers three questions:
  is it true and does it bring its evidence? Would an agent get this wrong
  without the line? And does the harness not already write the file the rule
  asks for? A rule that a file makes unnecessary does not qualify. Rules cite
  both number and text; numbers shift when rules leave, the text survives.
  Cross-cutting invariants — such as "done means verified by CI" — live in layer
  1; stack-specific details live in layer 2 modules. A rule that delegates to
  another place is checked against that place. The layer is edited down, not
  grown: `layer1.md` carries **18 rules**.
- **Reason:** Layer 1 is copied into every project. Every line there competes
  for context window and attention. A bloated layer 1 is ignored; an exhaustive
  one is worse than a short one because it hides what matters. Tables break
  formatting for long sentences. Rules that only describe the template duplicate
  its structure. Rules without evidence are opinions. Rules that delegate
  without checking their destination become false promises.
- **Rejected:** tables for rules; copying template structure into layer 1;
  growing layer 1 indefinitely; rules that state data visible in the repo;
  stack-specific CI details in layer 1; claiming "done" without CI.

## ADR-002 — Sensitive data is neither read without permission nor committed

- **Status:** ✅ accepted
- **Date:** 2026-08-04
- **Decision:** `.env` files, credentials, keys and real data dumps are not read
  without explicit permission, and they are never committed. Only `.env.example`
  — a template with no secrets — travels in the repository.
- **Reason:** What an AI reads enters the conversation and from there can leave
  the machine. A credential committed is a credential published. Permission to
  read real data is a human decision, not a default, and the safe file to share
  is the example.
- **Rejected:** reading `.env` to "understand the configuration"; committing
  dumps for debugging; treating credentials as just another source file.

## ADR-003 — Continuity documents: state and reasoning live in `docs/`, not in a single memory file

- **Status:** ✅ accepted
- **Date:** 2026-08-04
- **Decision:** A harnessed project keeps volatile state in `docs/SESSION.md`,
  written when a task closes and overwritten each time. Reasoning lives in
  `docs/DECISIONS.md`, append-only, with old decisions marked rather than
  deleted. A single `memory.md` or a `memory/` folder is not used. `SESSION.md`
  warns when it grows too large, but the warning is a trigger to review, not a
  hard limit.
- **Reason:** Measured on existing projects, the file that tried to do both
  state and reasoning either swelled to hundreds of lines or was abandoned at
  three lines. Separating them lets each file do one job: one is overwritten
  because git keeps the history, the other accumulates because the reasoning is
  part of the record. A hard size limit on `SESSION.md` was tried and failed;
  the useful part was the act of looking, not the number.
- **Rejected:** a single `memory.md`; a `memory/` folder; hard size limits on
  `SESSION.md`.

## ADR-004 — Subagents stay global

- **Status:** ✅ accepted
- **Date:** 2026-08-04
- **Decision:** The harness's subagents (`architect`, `reviewer`, `security`,
  `tester`) are generic roles, not project-specific staff. They are deployed by
  `sync:global` to the user's global configuration directories (`~/.claude/`,
  `~/.config/opencode/agents/`), never copied into individual repositories. Each
  project may point to them, but it does not own or edit them.
- **Reason:** Roles are shared patterns; copying them per repo guarantees drift
  and multi-machine rot. A single global source, versioned with the harness, is
  the only place a fix or a new role has to land. Project-specific behaviour
  belongs in `AGENTS.md`, not in a private copy of an agent.
- **Rejected:** per-project agent files; editing global agents inside a repo;
  duplicating the same reviewer across repositories.

## ADR-005 — `skills-lock.json` belongs to one project

- **Status:** ✅ accepted
- **Date:** 2026-08-04
- **Decision:** Each harnessed project keeps its own `skills-lock.json`. It is
  not shared with other repositories, not moved to a global location and not
  treated as a reusable asset.
- **Reason:** The file records the exact SHA-256 hashes of the skills installed
  in that repository. Sharing it between projects would make the hash list a lie
  the moment the projects diverge. Global skills are fine for generic agents;
  project-specific locks are fine for reproducible project state.
- **Rejected:** a global `skills-lock.json`; copying the lock between repos;
  ignoring it from version control.

## ADR-006 — Size limits are signals, not hard caps

- **Status:** ✅ accepted
- **Date:** 2026-08-04
- **Decision:** Layer 1 has no fixed size cap: a new rule must still justify
  replacing an old one. The full `AGENTS.md` has no enforced maximum either.
  `docs/SESSION.md` at **200 lines** is a signal to check for redundancy, not a
  prohibition.
- **Reason:** Hard caps are either ignored or gamed. A 110-line limit on layer 1
  in particular would silently allow the rest of `AGENTS.md` to bloat. Editorial
  discipline — every rule earns its place, every long file is flagged — works
  better than a number that passes or fails a build.
- **Rejected:** a 110-line cap for layer 1; a 500-line cap for the full
  `AGENTS.md`; treating line counts as CI failures.

## ADR-007 — Commit messages are conventional, in English, and carry only changes and reasons

- **Status:** ✅ accepted
- **Date:** 2026-08-05
- **Decision:** Commit messages are written in **English** and follow
  **Conventional Commits**: `type(scope): summary`, with `!` for a breaking
  change. The body carries **only** the list of changes and the reason for each
  one. The types are the standard eleven: `feat`, `fix`, `docs`, `style`,
  `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Reason:** English is the language of identifiers and tooling; mixing Spanish
  commits with English code creates a bilingual history that is harder to scan.
  Conventional Commits is already understood by release tools and changelog
  generators, and limiting the body to changes and reasons keeps history
  readable without inventing a custom format.
- **Rejected:** Spanish commit messages; a custom `[Intent]` format; bodies that
  explain how the change was made instead of why.

## ADR-008 — Version what travels, and measure before writing numbers

- **Status:** ✅ accepted
- **Date:** 2026-08-05
- **Decision:** In a harnessed project, `skills-lock.json` is committed because
  it is the only file that makes three machines rebuild the same skills.
  `.claude/` and `.agents/` are git-ignored and rebuilt like `node_modules`. The
  harness itself is versioned through `package.json`, the install seal and git.
  Any number written in documentation — line counts, commit sizes, park-wide
  counts — must come from a command (`wc -l`, `git show --numstat`, a sweep
  script), not from memory, and must declare its scope so it can be reproduced.
- **Reason:** If a file does not travel, it does not exist on another machine.
  Committing regenerated directories creates duplicates and drift; committing
  the lock does not. And a number in prose looks verified simply because it is a
  number: the only way to keep it honest is to generate it with a tool every
  time.
- **Rejected:** versioning `.claude/` and `.agents/`; writing "several" or
  "most" instead of counts; quoting figures without saying which command
  produced them.

## ADR-009 — CI and `verify` are the same contract

- **Status:** ✅ accepted
- **Date:** 2026-08-08
- **Decision:** The CI workflow invokes **`pnpm run verify` and nothing else**.
  What `verify` contains lives in `package.json`, so adding a check never edits
  the CI file. Every check that must be green enters `verify`, is run **before
  it is added**, and any check that is red is either fixed first or declared as
  a written exception with its reason. Time is not a reason to leave a check
  out.
- **Reason:** Two lists of the same thing in two files drift apart — that is how
  tests stop running in CI. A CI that is red from day one is ignored from day
  one, so every new check must be proven green locally before it protects the
  repo. A written exception is the only way to tell "not yet fixed" from
  "forgotten".
- **Rejected:** enumerating checks in the CI workflow; adding a check to
  `verify` without running it first; leaving `build` or other slow checks out of
  `verify` to save time.

## ADR-010 — The harness protects itself: no self-run, no private anecdotes in shipped artefacts

- **Status:** ✅ accepted
- **Date:** 2026-08-09
- **Decision:** `init-project` and `propagate` refuse to run on the harness's
  own source. They detect the source repo by comparing the resolved path, not by
  inspecting contents, so the guard works on all three operating systems.
  Anything the harness copies into another repo — templates, layer 1, reference
  — carries only the mechanism the reader needs; stories about how the rule was
  discovered, and names of private repos, stay in the private planning record.
- **Reason:** A script that can injure its own source turns a mistaken
  invocation into a silent self-sync loop. Path comparison fails across Windows
  case differences and Unix symlinks, so the guard must ask the filesystem. And
  a CVE from another project or an instruction like "when copying this, check…"
  is useless or harmful in the destination: the reader is no longer copying, and
  the private repo may be renamed or deleted.
- **Rejected:** comparing resolved paths; allowing the script to run on its
  source with a warning; copying anecdotes and private repo names into public
  artefacts.

## ADR-011 — Traps and lessons travel with the harness

- **Status:** ✅ accepted
- **Date:** 2026-08-10
- **Decision:** The harness ships `reference/traps.md` with failures the project
  has already paid for, each one naming the symptom, the cause and the remedy. A
  trap is only kept if it names its remedy; a failure without a fix is noise.
  The private census of which projects hit which trap stays outside the public
  harness; what travels is the pattern and how to check it.
- **Reason:** Agents repeat the same expensive mistakes because they do not
  inherit project memory. A trap that says both what can go wrong and how to
  verify the fix turns a private lesson into a reusable guard. The census of
  where it happened is private data; the pattern belongs to every project.
- **Rejected:** keeping traps without remedies; publishing the per-project
  census; relying on agents to remember past sessions.

## ADR-012 — The canonical command is `pnpm run verify`

- **Status:** ✅ accepted
- **Date:** 2026-08-12
- **Decision:** Documentation and CI use **`pnpm run verify`**, never the short
  form `pnpm verify`. The script in `package.json` is the single source of truth
  for what runs in CI and locally.
- **Reason:** The short form can silently behave differently across platforms or
  pnpm versions — on Windows it once produced a false green by resolving to
  something other than the `verify` script. `pnpm run verify` is unambiguous: it
  always runs the script declared in `package.json`.
- **Rejected:** relying on `pnpm verify` in docs, scripts or CI.

## ADR-013 — One repo, one harness, at the root

- **Status:** ✅ accepted
- **Date:** 2026-08-16
- **Decision:** A repository receives **one** harness, at its **root**. Layer 2
  declares the union of whatever stacks the detector finds, but no harness files
  live in subfolders. What the root cannot declare — different Node majors for
  different folders, separate `verify` scripts per folder — is declared as an
  exception in layer 2 and written by a person, not inferred by a mechanism.
- **Reason:** The detector already scans the root and two levels down, and the
  layer-2 mark already admits several stack modules. The alternative — one
  harness per folder — would duplicate the layer 1 in every subproject and
  create nested `CLAUDE.md` files that Claude Code loads on demand and does not
  reinject after `/compact`, so the harness silently disappears mid-session. The
  root harness is the one that survives.
- **Rejected:** one harness per project folder; making `propagate` walk
  subdirectories; using `.claude/rules` with `paths:`.

## ADR-014 — Mark grammar: one block per family, two languages, and rejection of ambiguity

- **Status:** ✅ accepted
- **Date:** 2026-08-29
- **Decision:** A harnessed file may contain at most **one block per mark
  family**. The parser recognises both the old Spanish keys (`capa1`, `capa2`)
  and the new English ones (`layer1`, `layer2`), but it always writes English. A
  file whose marks do not pair, or that contains two blocks of the same family,
  is **refused** — nothing is written and the exit is non-zero. The retired
  `rules`/`reglas` and `repairs`/`reparaciones` families are not taught to the
  scanner as single-comment blocks because those blocks were never updated by
  any command. A grafted block is separated from the project prose by exactly
  one blank line.
- **Reason:** The marks are the only boundary between harness-owned and
  project-owned text. If the parser reads them in more than one way it can
  silently replace project prose, as happened when an unclosed opener paired
  with a later injected closer. Two blocks of the same family leave the file
  with two contradictory versions of the same layer. Refusing keeps the damage
  where a human can see it, and the English-only write avoids carrying the
  private repo's name inside every public mark.
- **Rejected:** guessing where a missing closer belongs; updating both blocks of
  a duplicated family; teaching the scanner the single-comment `rules` form;
  leaving bilingual marks in newly written files.

## ADR-015 — A command earns its place or is removed

- **Status:** ✅ accepted
- **Date:** 2026-08-06
- **Decision:** A command exists only if it does something that a rule plus a
  sentence cannot. The three valid reasons are: it restricts permissions (a
  read-only subagent), it imposes an order that would be forgotten (tests before
  committing), or it fixes an output format that makes two runs comparable.
  Commands that merely apply a rule already loaded in every session are removed.
  The harness started with eleven commands and was reduced to **six**:
  `before-commit`, `commit-all`, `find-dead-code`, `init-project`, `propagate`,
  and `write-docs`.
- **Reason:** The stronger layer 1 is, the fewer commands are needed. Every
  command is generated in two dialects, so each surplus is paid twice. A command
  nobody invokes because it is faster to ask for the same thing in prose is dead
  weight that also drifts out of sync with the rules.
- **Rejected:** keeping commands "just in case"; replacing rules with commands;
  growing the command set as the rule set grows.

## ADR-016 — No base skills list in layer 1

- **Status:** ✅ accepted
- **Date:** 2026-09-05
- **Decision:** Layer 1 does not include a default list of skills. When a
  project starts, the owner runs `npx autoskills --dry-run` in their own
  terminal, reviews the proposals, and decides what to install. The harness
  ships no skill catalogue of its own.
- **Reason:** Skills that are genuinely stack-independent and stable already
  live at the global level and are distributed by `sync-global`. A per-project
  list would either be empty or would invent cross-cutting recommendations
  without evidence. The filter is human because the detector gets the language
  right and the role wrong.
- **Rejected:** shipping a default skill list; formalising an empty list to
  declare a blind spot; installing skills automatically during `init-project`.

## ADR-017 — Commands are tested by their effects, and `propagate` exists as a command

- **Status:** ✅ accepted
- **Date:** 2026-09-05
- **Decision:** A harness command is not executed in tests to prove it works;
  what is tested is **what it leaves written**. Each deterministic effect has
  its own test — link checker for links, marks guard for marks, format check for
  formatting, ASVS tests for the generated indexes. The only thing tied directly
  to a command is the ADR template shape that `/write-docs` dictates. The
  `/propagate` command exists because a graft with no owner would leave layer 1
  unmanaged; it is the counterpart to `/init-project` for files that already
  exist.
- **Reason:** Commands mix measurable text with judgement. Testing the judgement
  would measure something else and call it obedience. Testing only the effects
  keeps the tests deterministic and keeps the command's prose free to explain
  without becoming a specification. `/propagate` closes the loop: layer 1 must
  be updatable without re-running the full `init-project` flow.
- **Rejected:** running commands inside `verify` and inspecting their output; a
  general framework for command verification; testing command prompts as if they
  were scripts; leaving grafted layer 1 without a dedicated command.

## ADR-018 — `init-project` reports and offers the foundations a project is missing

- **Status:** ✅ accepted
- **Date:** 2026-09-07
- **Decision:** When harnessing a project, `init-project` checks whether the
  repo has the basics layer 1 demands and reports what is missing. The checks
  are: `.gitattributes`, a pinned Node version (`.nvmrc` or a non-range
  `engines.node`), a pinned package manager (`packageManager`), a `verify`
  script built from real candidates, a CI workflow that invokes `verify`, and no
  unchecked `.env` that CI will lack. The command then **offers** to add what is
  missing — `.gitattributes` and the CI mould can be written directly; `.nvmrc`
  and `packageManager` are asked; `verify` is only proposed as a set of
  candidates to run, never written blindly. Nothing is installed without the
  owner's say-so in that exchange; what is not authorised goes to
  `docs/SESSION.md`.
- **Reason:** The harness was handing out rules and never saying when a repo did
  not meet them. A `verify` born red is ignored from day one, and a CI written
  before the version and package manager are pinned is red on arrival. Offering
  the fixes one block at a time, with the cost of each visible, turns the report
  into action without removing the owner's decision.
- **Rejected:** only reporting and leaving the owner to remember; writing
  foundations silently; proposing a `verify` script without running the
  candidates first; deducing `.nvmrc` from `engines.node` or vice versa.

## ADR-019 — The harness is reversible: `uninstall` removes only what it put there

- **Status:** ✅ accepted
- **Date:** 2026-09-07
- **Decision:** The harness ships an `uninstall` command with two scopes. For a
  project, it removes the harness blocks from `AGENTS.md` and any mould file
  that carries a block, but it **never deletes the file itself** and it deletes
  `CLAUDE.md` only when it is the bare pointer the harness wrote. For a global
  deployment, `--global --dest <folder>` removes exactly the files tracked by
  the install seal and nothing else. The command is dry-run by default and lists
  what would disappear.
- **Reason:** Installing something you do not know how to remove turns a trial
  into a commitment. The marks make removal simple: `outside()` already proves
  that `propagate` never touches anything beyond them. Without a record of what
  was deployed, the global uninstaller cannot tell ours from someone else's, so
  it refuses to act.
- **Rejected:** removing whole files by default; classifying remaining files as
  "skeleton" vs "owned"; deleting without a dry-run first.

## ADR-020 — Two layers: the harness writes layer 1, the project owns layer 2

- **Status:** ✅ accepted
- **Date:** 2026-09-14
- **Decision:** A harnessed file has exactly two layers:
  - **Layer 1** — inside the harness marks, written and updated by the harness.
  - **Layer 2** — everything outside the marks, owned by the project. The
    harness writes layer 1 at the top of the file so rules are read before the
    prose they govern. When a file already exists, everything outside the marks
    stays byte-for-byte identical. The generator never writes layer 2; an agent
    may propose layer-2 sections, but only with the owner's approval.
- **Reason:** The mark is the only reliable boundary between harness-owned and
  project-owned text. Anything the harness writes outside its marks becomes
  project text the moment it is written and is never touched again. Keeping the
  boundary physical prevents the harness from silently overwriting project
  prose.
- **Rejected:** three layers; a layer 2 of stack-specific rules written by the
  harness; scaffolding or placeholder sections in new files; writing layer 2
  automatically.

## ADR-021 — The installer deploys `reference/` whole and never writes tool configuration

- **Status:** ✅ accepted
- **Date:** 2026-09-15
- **Decision:** The global installer writes only into the folders it creates:
  `~/.claude/{agents,commands,reference}` and
  `~/.config/opencode/{agents,commands}`. It never writes tool configuration
  files such as `~/.claude.json`, `~/.claude/settings.json` or
  `~/.config/opencode/opencode.json`; it reads them and reports what is missing.
  `reference/` is deployed whole, byte for byte, including CSVs and PDFs, to a
  single copy at `~/.claude/reference/`. The installer warns when opencode
  cannot read that path because `permission.external_directory` is missing.
- **Reason:** Tool configuration files contain personal settings and
  permissions; merging into them is the most dangerous operation the installer
  could do, so it is avoided entirely. `reference/` needs to be complete and
  identical on every machine because prompts cite paths inside it; splitting or
  filtering it would force the dialect converter to rewrite paths inside prompt
  bodies and would silently drop files such as CSVs and PDFs.
- **Rejected:** writing or merging tool settings; deploying two copies of
  `reference/`; filtering `reference/` by extension; using a third neutral
  folder or symlinks.

## ADR-022 — ASVS security level, area mapping and age checks

- **Status:** ✅ accepted
- **Date:** 2026-09-16
- **Decision:** The harness ships an OWASP ASVS index in `reference/security/`
  and a `security` agent that uses it. A harnessed project declares its ASVS
  level and re-estimate trigger in its `## Security` section; if none is
  declared, the agent derives the level from three signals (accounts,
  money/personal data, own backend). The same section may declare an `Areas:`
  list mapping project paths to ASVS chapters; paths not in the list are read,
  deduced and proposed for addition. The harness itself runs `asvs-age` in
  `verify`, which cuts after 180 days by reading the stamped date in
  `reference/security/source/README.md`. The `asvs-update` command is manual and
  never automatically bumps the OWASP tag. `pnpm audit` belongs in a
  `before-commit` step, not in `verify`, because it fails on upstream CVEs the
  project cannot fix.
- **Reason:** A security review needs a depth dial that is set before the review
  starts, otherwise the agent either misses risks or wastes time on irrelevant
  chapters. The level and area list live in project-owned layer 2 because only
  the project knows its threat model. The age check lives in the harness repo,
  not in every project, because the harness maintains the ASVS sheet; a project
  cannot fix a stale standard. `pnpm audit` is useful at commit time but
  blocking `verify` with fresh transitive CVEs trains developers to skip the
  whole verification pipeline.
- **Rejected:** inferring the level and areas from scratch on every review;
  running `asvs-update` automatically in `verify`; shipping `asvs-age` to every
  harnessed project; putting `pnpm audit` in `verify`.

## ADR-023 — `CLAUDE.md` is a pointer by its `@AGENTS.md` line

- **Status:** ✅ accepted
- **Date:** 2026-09-17
- **Decision:** A `CLAUDE.md` is a pointer when it contains the line
  `@AGENTS.md`. Content that is specific to Claude Code may stay below that
  line; content that duplicates rules from `AGENTS.md` must be migrated. The two
  problems are never mixed: a missing import is fixed with one line; rules
  inside `CLAUDE.md` are a migration that the owner approves.
- **Reason:** `CLAUDE.md` is read only by Claude Code; `AGENTS.md` is the
  standard every tool reads. Without the `@AGENTS.md` line, `AGENTS.md` is
  invisible to the session. With it, Claude Code-specific notes below do not
  harm anyone.
- **Rejected:** requiring `CLAUDE.md` to hold exactly one line; treating a
  missing import and rules inside `CLAUDE.md` as the same problem.

## ADR-024 — Deployment files carry a `generated-by` mark in the body, and deletion is decided by that mark

- **Status:** ✅ accepted
- **Date:** 2026-09-17
- **Decision:** Every file this harness deploys carries the mark
  `<!-- generated-by: harness -->` **in the body**, just below the frontmatter.
  A managed file is deleted only if it carries the mark and no longer exists in
  the source; a file without the mark is someone else's and is left alone.
  `reference/` is never pruned because it contains non-Markdown files that
  cannot carry the mark.
- **Reason:** The mark answers _«did this harness put this file here?»_ inside
  the file itself, so the answer survives outside registries or manifests.
  Putting it in the frontmatter would make opencode forward unknown keys to the
  model provider; putting it in the body keeps the two dialect bodies identical
  and keeps the deletion rule simple.
- **Rejected:** keeping the mark in the frontmatter; relying on an external
  manifest to decide what to delete; never deleting and leaving retired commands
  alive on every machine.

## ADR-025 — Scripts are not installed on the machine: the install seal points to the clone and `--check` detects drift

- **Status:** ✅ accepted
- **Date:** 2026-09-17
- **Decision:** The harness does not install executable scripts on the machine.
  The global installer writes agents, commands, templates and reference, and
  stores an install seal at `~/.claude/harness/install.json` that records the
  version, install time, enabled tools and clone path. The `/init-project` and
  `/propagate` commands read that seal to find the scripts in the clone. A
  separate `--check` compares the deployed copy against the source and fails if
  they drift; when run without `--dest` it checks the current machine's home.
- **Reason:** `scripts/` changes often; a copy installed on the machine is one
  more thing to keep in sync and one more place for an old version to keep
  running. The clone already has to exist, so pointing to it costs nothing and
  avoids the copy. Drift between source and deployed copy is dangerous because
  the tests read the source while the tool reads the copy; checking it on demand
  keeps `verify` free of network or machine-specific concerns.
- **Rejected:** installing `scripts/` to `~/.claude/`; installing only a subset
  of scripts; keeping a separate `~/.harness-sync.json` file; relying on the
  seal alone to detect hand-edited deployed files.

## ADR-026 — The harness supports both Claude Code and opencode, with their differences declared

- **Status:** ✅ accepted
- **Date:** 2026-09-17
- **Decision:** The harness serves **both Claude Code and opencode**; it does
  not choose one. Commands are generated in two dialects from one source so the
  body stays byte-for-byte identical and only the frontmatter differs. The
  harness declares where the two tools do **not** offer the same guarantees:
  - In Claude Code, the `bash-allow` list of write commands is translated into
    scoped `Bash(...)` entries in `allowed-tools`; in opencode the same list is
    preserved natively.
  - In Claude Code, subagents receive `Bash` without command-level restrictions
    because that tool removes the whole tool when any pattern is denied; this is
    declared in each agent's body.
  - In opencode, the write commands `/init-project` and `/propagate` inherit the
    permissions of the `build` agent; this asymmetry is declared rather than
    hidden.
  - `reference/` lives only in `~/.claude/reference/`; opencode reaches it
    through `permission.external_directory`, and the installer warns when that
    rule is missing.
- **Reason:** Both tools are in real use; picking one would force redoing work
  when switching back. A shared source with dialect-aware generation costs less
  than maintaining two copies. Where the permission models differ, the harness
  writes the guarantee explicitly instead of pretending the tools are identical.
- **Rejected:** choosing only one tool; duplicating source files per tool;
  hiding the permission differences; adding a dedicated opencode agent just to
  scope the two write commands.

## ADR-027 — Official docs and MCPs are consulted, never silenced, and Context7 is the project's MCP

- **Status:** ✅ accepted
- **Date:** 2026-09-18
- **Decision:** Official documentation and MCPs are always consulted and never
  silenced. If what they say clashes with an ADR, the clash is reported, not
  hidden; a verifiable fact (an API change, a deprecation, a CVE) overrides a
  preference until the ADR is revised. Rule 17 names **Context7** as the MCP
  every project uses, with the pattern `resolve-library-id` followed by
  `query-docs` at the installed version. The installer warns if Context7 is not
  configured.
- **Reason:** An old decision cannot be allowed to override a new fact, or it
  becomes a lie that hides security issues and breaking changes. At the same
  time, the rule must be visible enough that no project "forgets" to consult the
  docs. Naming Context7 in layer 1 makes the requirement explicit, while keeping
  the obligation to report when the MCP does not answer.
- **Rejected:** keeping a curated list of links; naming Context7 only "if
  available"; saying "the ADR overrides the docs" without distinguishing fact
  from preference.

## ADR-028 — Prettier uses 80 columns everywhere

- **Status:** ✅ accepted
- **Date:** 2026-09-18
- **Decision:** The harness uses a single Prettier configuration with
  `printWidth: 80` for every file type. There is no override for Markdown; prose
  and code share the same width. The other keys are the canonical ones:
  `tabWidth: 2`, `semi: true`, `singleQuote: true`, `trailingComma: "all"`,
  `endOfLine: "lf"`, `proseWrap: "always"`.
- **Reason:** A single width keeps diffs predictable and avoids the surprise of
  a line wrapping differently because of its file extension. Eighty columns is
  narrow enough for side-by-side diffs and wide enough for JavaScript.
- **Rejected:** per-file-type `printWidth` overrides; a wider code width.

## ADR-029 — The public harness is JavaScript and English

- **Status:** ✅ accepted
- **Date:** 2026-09-18
- **Decision:** The public harness is scoped and written as follows:
  - **JavaScript/Node** — the harness targets JavaScript projects, and does not
    pretend to be language-neutral.
  - **English throughout** — code, identifiers, configuration keys, mark keys,
    templates, commands, agents and documentation are all in English.
  - **Projects write in their own language** outside the harness marks. The
    harness never injects non-English text, neither inside nor outside the
    marks.
  - **The boundary is the mark, not the language.** What is inside a harness
    mark belongs to the harness; what is outside belongs to the project.
- **Reason:** A public harness needs a clear scope and a single language to be
  copyable and maintainable. Pretending to be language-neutral hides what the
  tool actually does; allowing bilingual templates would make project prose
  drift silently between repositories.
- **Rejected:** a language-neutral harness; translating templates per project;
  using language as the boundary between harness-owned and project-owned text.

## ADR-030 — Node 24, pnpm 10, `.gitattributes`, and pnpm settings in `pnpm-workspace.yaml`

- **Status:** ✅ accepted
- **Date:** 2026-09-18
- **Decision:** The harness pins its toolchain and repository conventions as
  follows:
  - **pnpm only**, never npm. Version pinned to **10.34.1** in `packageManager`.
  - **Node 24.x** in `.nvmrc` and `engines.node`.
  - **pnpm settings** — `minimumReleaseAge`, `saveExact`, `ignoreScripts`, etc.
    — live in **`pnpm-workspace.yaml`**, not in `.npmrc`. `.npmrc` is reserved
    for registry and authentication only.
  - **`.gitattributes`** is mandatory from the first commit:
    `* text=auto eol=lf`, with Windows scripts (`*.ps1`, `*.bat`, `*.cmd`) using
    CRLF. This keeps line endings deterministic across Win11 and Ubuntu.
  - The general rule for new projects is: pin the **highest LTS that the stack
    accepts**, reading the ceiling from declared dependencies, not inventing it.
- **Reason:** A harness that tells tools what to do is more useful than one that
  pretends to be neutral. pnpm 10 is stable, Node 24 is the active LTS, and
  `pnpm-workspace.yaml` is the only place pnpm reliably reads these settings in
  pnpm 10 and beyond. Keeping them in `.npmrc` has already silently disabled
  quarantine in several repos. Mixed line endings are a real cross-platform
  hazard: a CRLF `.nvmrc` reads as `"24\r"` and breaks both CI and the local
  version switcher.
- **Rejected:** npm; putting pnpm settings in `.npmrc` with kebab-case keys
  (works today, breaks silently later); pinning a Node number in layer 1 instead
  of stating the rule; leaving `.gitattributes` out and relying on editor
  settings.

## ADR-031 — The verification checks stay, with their limits

- **Status:** ✅ accepted
- **Date:** 2026-09-18
- **Decision:** The repo keeps five dedicated guards plus two standard checks in
  `verify`:
  1. `format:check` — Prettier in check mode.
  2. `leak-guard` — scans for absolute paths and private names. The **name
     check** only runs where the private-name list is available; in CI it is
     skipped and reported as a declared exception.
  3. `marks-guard` — detects orphan mark families and old-language marks.
  4. `vocabulary-guard` — catches words an ADR explicitly ruled out.
  5. `check-links` — checks every **relative** Markdown link and anchor.
     Absolute URLs and mail links are ignored: their availability depends on the
     network, and a CI that fails for external reasons is soon ignored.
  6. `asvs-age` — reads the stamped date in
     `reference/security/source/README.md` and **cuts `verify` after 180 days**.
  7. `test` — the test suite.
- **Reason:** Each guard watches something a human would miss but that degrades
  the published repo: leaks, broken links, unmanaged marks, drifting vocabulary,
  or a stale security standard. The limits are part of the design: a name check
  without the name list would either publish the names or pass silently, and the
  180-day window was derived from OWASP release history.
- **Rejected:** dropping any of the guards; dropping `templates/CLAUDE.md`
  instead, because the code writes the pointer line directly.

## ADR-032 — MIT for the harness, and `reference/security/` stays under CC BY-SA 4.0

- **Status:** ✅ accepted
- **Date:** 2026-09-18
- **Decision:** The repository is published under **MIT**. The exception,
  declared inside the `LICENSE` file itself, is `reference/security/`: it is
  adapted from the OWASP ASVS and remains under **CC BY-SA 4.0**.
- **Reason:** The ASVS is © 2008-2025 The OWASP Foundation and is share-alike;
  relicensing it under MIT would be false. Putting everything under CC BY-SA
  would impose copyleft on a harness meant to be copied without conditions.
- **Rejected:** a separate `NOTICE` file — a second file nobody opens does not
  inform anyone.

<!-- Guidance, copied from the harness's DECISIONS template when this file
     was created. **Nothing rewrites it**: it is not a managed block, so
     edit it freely, or delete it once the habit is yours.

  🔴 IT IS BORN `🔶 proposed`. Only the owner moves it to `✅ accepted`.
  Writing "decided" over your own conclusion is the specific failure this rule
  came from.

  STATUSES: 🔶 proposed · ✅ accepted · 🗑️ withdrawn (never accepted). An
  accepted entry is never deleted; if it stops holding, another one revises it.

  FORMAT, and it is not cosmetic — every entry opens exactly like this:

      ## ADR-0NN — Title in one line, stated as a fact

      - **Status:** 🔶 proposed (YYYY-MM-DD)
      - **Decision:** …
      - **Reason:** …
      - **Rejected:** … (only if there was a real alternative)

  WHAT IS CHECKED AND WHAT IS NOT, said out loud so nobody manufactures
  violations: ONLY `Status` is machine-checked. `Decision`, `Reason` and
  `Rejected` are GUIDANCE — an entry without them breaks nothing. They are
  asked for because they are what gives the entry value in six months, but
  their presence cannot be verified: a `Reason:` full of filler would pass any
  test, so checking it would grant false rigour.

  🔴 THE STATUS GOES IN ITS FIELD, NOT APPENDED TO THE TITLE. This file is born
  without a real example on purpose — a fake one invites leaving it there — so
  the format is stated here or it gets guessed. Guessed, the status ends up as
  a title suffix: the file looks right and a check looking for the field goes
  red.

  WHEN TO WRITE ONE: when the answer to "why is it like this?" is not visible
  in the code. If it is visible, no entry is needed.

  REASON ≠ JUSTIFICATION: "the client asked for it" or "it is cleaner" are not
  reasons. A reason cites something that happened, something measured, or a
  real constraint. If the only reason is a preference, say it is a preference.

  FIGURES COME FROM A COMMAND, not from memory. A number written by eye looks
  verified precisely because it is a number, and ages without anyone looking.

  NUMBERING: sequential and never reused. If a number is skipped, leave it
  skipped and say so — recycling it breaks the links of whoever cited it.

  SIZE: no cap. This file is read **deliberately**, not every session, so
  growing costs no context. What matters is that each entry stands alone:
  whoever reads it in a year will not have the thread in front of them.

-->
