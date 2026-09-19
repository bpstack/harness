# Layer 1 — invariants

The block the generator copies **verbatim** into every project's `AGENTS.md`,
between its marks. Everything outside the marks is layer 2: the project's own,
and the harness never touches it.

**Every rule earns its place by three questions:** is it true and does it bring
its evidence? Would an agent get this wrong without the line? And does the
harness not already write the file the rule asks for? A rule that a file makes
unnecessary does not qualify.

**Rules are cited by number and by text** («rule 1, _verify before asserting_»):
numbers shift when a rule leaves, and the text survives.

**Everything above the line stays here.** From the `---` down is what travels.

---

## Verification

1. **Verify before asserting, and with whatever consumes it.** Never take a
   file's word about the environment: **run the tool that reads it and trigger
   what it controls.** What cannot be checked stays `❓ pending`, said out loud.

   _Asking is not enough: `pnpm config get` answered `42` for a key that does
   not exist, and `true` for one that changed nothing._

2. **"Done" means verified by CI, not asserted.** What has not passed the gate
   stays pending, and that is said.

   _A green on your machine only proves your machine._

## What the AI does not decide

3. **`.env`, credentials and real data dumps: neither read without explicit
   permission, nor committed.** What the agent reads **enters the
   conversation**, and from there it does not come back. `.env.example` is what
   travels.

4. **The AI installs and configures nothing on its own**: it proposes, the owner
   decides.

   _An install or a config change lands in everyone's lockfile and CI, and
   neither shows in the diff the agent presents._

5. **Nothing destructive without a `--dry-run` first**, showing what would be
   deleted.

   _A `git clean -fd` took three unrecoverable directories._

6. **The AI commits; the person decides the push.** Local commits pile up until
   the go-ahead, **and one go-ahead covers one push**, not the next ones.

7. **No AI trace in commits or output**: no `Co-Authored-By`, no "Generated
   with…".

   _Tools add it by default. History says what changed and why, not with which
   tool._

8. **Conventional Commits, in English**: `type(scope): summary`, with `!` for a
   breaking change. The types: `feat` · `fix` · `docs` · `style` · `refactor` ·
   `perf` · `test` · `build` · `ci` · `chore` · `revert`. The body carries
   **only** the list of changes and the reason for each — the how is already in
   the diff.

## The environment

9. **An agent session has no Node auto-switch.** The hook lives in the shell
   profile and a non-interactive session never loads it: the session runs on
   whatever Node it **inherited when it was launched**, and `cd` into another
   project does not change it.

   **Start the session from a terminal already on the repo's version** — enter
   the directory, let fnm/nvm switch, then launch the agent. **One session per
   project.**

   _If that was not done, activate it on every invocation: `fnm use <major>`
   then the command. `fnm exec --using=N pnpm` does not work on Windows — `pnpm`
   is a `.cmd` and `fnm exec` only launches real executables._

10. **pnpm, never npm.**

_`npm install` leaves a `package-lock.json` next to `pnpm-lock.yaml`, and two
installers disagree in silence._

11. **pnpm settings live in `pnpm-workspace.yaml`**; `.npmrc` carries registry
    and authentication only — from pnpm 11 anything else there is ignored, and
    pnpm 10 still reads it, so it works today and stops on upgrade. Every repo
    with dependencies sets `minimumReleaseAge` there.

## Continuity

12. **State lives in `docs/SESSION.md`**, written **when a task closes** — at
    session close there is no context left — and **overwritten**: git keeps the
    history. Nothing the code or `git log` already tells goes in.

13. **The reasoning lives in `docs/DECISIONS.md`**, append-only. A decision that
    changes **is not edited**: another is appended revising it, and the old one
    is **marked, never deleted**. Knowing what was believed is part of the
    record.

14. **An exception is declared** in the project's `AGENTS.md`, with its reason
    and its scope; failing silently is not an option. Does not apply to
    security, AI traces or pushing.

## Naming

15. **File names, configuration keys and identifiers in English.**

## Knowledge that is not in this file

16. **Skills are per project.** `npx autoskills` installs them into
    `<repo>/.claude/skills/`, which is **git-ignored and rebuilt** like
    `node_modules`; **`skills-lock.json` is committed** — it carries each
    skill's source and hash, and it is what makes three machines rebuild the
    same set. **The developer runs `autoskills`, not the agent** — `npx`
    downloads a package, and installing is not the agent's call.

_Global skills in `~/.claude/skills/` are the machine's, not the project's._

17. **Official docs and MCPs are consulted and never silenced**, at the
    **installed** version — from the lockfile, not the `^` range. **Context7 is
    the one every project uses**: `resolve-library-id`, then `query-docs` at
    that version. If the MCP does not answer, say so instead of pretending it
    was consulted.

## Review

18. **When work is reviewed, this is the shape.** `architect` before building;
    `reviewer` and `security` over what was built, **read-only**; `tester` to
    verify. Run them whenever you want, together or on their own.
