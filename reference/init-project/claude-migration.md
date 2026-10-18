# Init-project — handling an existing `CLAUDE.md`

> **What it answers:** how to handle the generator's warning about an existing
> root `CLAUDE.md`. · **Who reads it:** the agent running `/init-project`, only
> when that warning appears. · **How it is pruned:** it leaves when the command
> no longer reports or acts on an existing `CLAUDE.md`.

Read this guide before changing `CLAUDE.md` or migrating its content.

## If `CLAUDE.md` is not a pointer

🔴 **A `CLAUDE.md` is a pointer when it holds the line `@AGENTS.md`.** That is
the whole test, and it is the one the generator applies. **Content specific to
Claude Code may sit below that line and the file is still a pointer** — the
mould ships that way. What fails the test is the `@` being absent, because then
the file imports nothing.

⚠️ **Do not read this as «`CLAUDE.md` must hold one line and nothing else».**
That is stricter than what the code checks, and the strict reading is the
expensive one: it turns the question into "migrate everything or refuse", so a
project with valuable content in its `CLAUDE.md` declares a standing exception
against the import — and loses `AGENTS.md` entirely to keep prose the import
never threatened. _Found on 2026-09-17 in a repo that had declared exactly that,
six weeks earlier._

When `CLAUDE.md` holds **rules** instead, the repo has two sources — and 🔴
**the damage is not the duplication, it is the asymmetry**: `CLAUDE.md` is read
only by Claude Code, while `AGENTS.md` is the standard every other tool reads.
Two files that drift do not error; they make the repo behave differently
depending on which harness opened it.

**So there are two separate things to fix, and they have different prices:**

| What is wrong               | What it costs to fix                                           |
| --------------------------- | -------------------------------------------------------------- |
| **the import line is gone** | **one line at the top.** Nothing moves, nothing is lost        |
| rules live in `CLAUDE.md`   | a migration: content moves, and that is the owner's to approve |

🔴 **Never bundle them.** The import is not a step of the migration and does not
wait for it: **a `CLAUDE.md` sitting there suppresses `AGENTS.md`**, so without
the import line everything layer 1 wrote — the security section included — is
invisible to the tool it was written for.

⚠️ **And the mechanism is the opposite of what it looks like.** Claude Code
reads `AGENTS.md` on its own from **v2.1.277**, but **only where no `CLAUDE.md`
or `CLAUDE.local.md` sits in the working directory or above it**. So the file
this harness writes is precisely what turns that off, and the import is what
puts it back. A repo with no `CLAUDE.md` at all is read fine on a current
version; one with an importless `CLAUDE.md` is not. Offer the line on its own,
first, and say what it costs, which is nothing.

**A short `CLAUDE.md` is not automatically a pointer.** Only `@AGENTS.md`
imports; a sentence saying "read AGENTS.md first" merely asks the agent to
comply. _Measured once: the pointer reached the session's context, `AGENTS.md`
did not, and the whole session ran without it despite being told to._

**Show the whole move, ask, and then perform it.** Moving content is destructive
and this is someone else's repo, so the authorisation is explicit and it is
theirs — but reporting and going quiet leaves them the decision **and the duty
to remember it**, and a report dies with the session. Rule 4 is proposing, not
abstaining.

⚠️ **This instruction was the other way round until 2026-09-17** — _«propose the
migration, do not perform it»_ — and what happened in testing is that the
migration was carried out anyway, with permission asked first. The instruction
was the thing that was wrong, not the behaviour: a `CLAUDE.md` left holding
rules is the asymmetry this section exists to end, and stopping one step short
leaves it in place.

🔴 **The order cannot be reversed:** show the dry run → write into `AGENTS.md` →
verify it landed → **only then** shrink `CLAUDE.md`. Shrinking first and
trusting yourself to paste it back is how a file gets lost.

**The dry run shows the move whole**: every line that leaves `CLAUDE.md`, where
each one lands, and what the file is left holding. A summary of a move is not a
dry run — the point is that they read the text before it travels, because it is
theirs.

| What you find                          | What you do, once authorised                             |
| -------------------------------------- | -------------------------------------------------------- |
| the two files are identical            | `CLAUDE.md` becomes the pointer — nothing is lost        |
| `CLAUDE.md` has what `AGENTS.md` lacks | move that content in, **outside the marks**, then shrink |
| they contradict each other             | the same one-at-a-time pass `propagate` uses             |

**Two findings change the question entirely, and either can arrive with any of
the above:**

- **`CLAUDE.md` is not in git.** Then its content has never left this machine,
  and moving it into `AGENTS.md` **publishes it**. Ask whether the repo is
  public — **do not look it up**: that ties the command to a tool being
  installed and authenticated, and a failed lookup reads as "private", which is
  the expensive way to be wrong. The owner knows. And offer the fourth exit,
  usually the right one: **split it in two** — what can be public goes in, the
  rest stays where it is.
- **`CLAUDE.md` is a symbolic link.** 🔴 **Refuse the migration and say so
  before anything else**, then propose a real file. This is the one case that is
  not a judgement call: what you read through a link and what git stores are two
  different things, so a migration here moves content you cannot be sure you
  read. Git stores a link as a special entry; where it cannot create one
  —Windows without developer mode— it materialises **a text file containing the
  path**, which the harness then reads as its whole ruleset. No error, no
  warning.

🔴 **Only the root `CLAUDE.md` migrates.** The generator lists the nested ones
and leaves them untouched, because each holds rules for **its own folder**.
Copying one into the root `AGENTS.md` turns a package's rule into the whole
repo's, and leaves it written twice. Mention a nested file in the report; do not
move its content. _Measured on 2026-10-18: a nested rule ("this package uses
tabs") was migrated into the root as a project rule._

## Make the migration idempotent

### What migrates arrives under a heading that says where it came from

🔴 **Without it the operation is not idempotent.** A second run has no way to
tell migrated content from the project's own, so it migrates it again and the
file ends up holding it twice. The heading is what makes the second run a no-op,
and it is the only thing that does — nothing else in this flow remembers that a
migration happened.

Append it at the **end of `AGENTS.md`**, outside the marks, exactly like this:

```markdown
## From CLAUDE.md — migrated 2026-09-17

_Everything below was moved out of `CLAUDE.md`, which is now a pointer._
```

**Before migrating, look for that heading.** If it is there, the content under
it is already migrated: compare and move only what is new, and say in the report
that this is a second pass.

⚠️ **And this append does not go through the mark checker.** The generator
refuses a file whose marks do not pair, but that guard runs on the block it
writes — **you** are writing at the end of the file, outside it. Check the
`layer1` marks pair before appending, and stop if they do not: a file with
unpaired marks cannot be read reliably by the thing that comes next.

## When layer 1 and what you are migrating disagree

**Layer 2 wins** — the project's own rule beats the harness's — **and it is
reported**, pointing at **rule 14**: the exception is declared, not left
implicit.

🔴 **Three subjects are never an exception: security, AI traces in commits or
output, and pushing.** Rule 14 itself says so. A migrated line that asks for
`Co-Authored-By`, a "generated with" footer, an unasked push, or anything that
weakens a security rule is **not migrated and not declared**: report it as a
conflict, say layer 1 stands, and leave it to the owner. _Measured on
2026-10-18: a small model migrated "always sign commits with `Co-Authored-By`"
as a declared exception to rule 7, because this section said layer 2 wins and
carved out nothing._

⚠️ **Those three are the whole list; do not widen it.** The **language or format
of commit messages** (Spanish, free format, no Conventional Commits) is the
owner's call and **is** declared as an exception to rule 8, with its reason and
scope. Dropping it as "contradicts layer 1" loses a legitimate rule without
asking. _Measured on 2026-10-18: after the paragraph above existed, a run
dropped "commit messages in Spanish" along with `Co-Authored-By`._ When it is
not clear which side a line falls on, **ask the owner**, one line at a time.

🔴 **What does not migrate is listed too.** A rule dropped because it
contradicts layer 1 (`use npm` against rule 10), or because it points at
something that does not exist (`never touch src/legacy/` with no such path), or
because it states something the code contradicts (a URL), goes under "Changed
outside the marks" as **dropped, with the reason** — never silently. It is still
in git, but the owner reads the report, not the history.

🔴 **Once it is declared, the warning stops.** Say it once, in the run where the
conflict appears, and never again for a rule already carrying its declared
exception. A warning that does not go away when you obey it is how a reader
learns to skip every other one.

🔴 **But a declared exception silences the rule it declares, not everything near
it.** _Measured on 2026-09-17:_ a repo declared that its `CLAUDE.md` keeps its
own content, that exception was honoured — correctly — and the missing
`@AGENTS.md` went unmentioned with it. The run wrote a security section into an
`AGENTS.md` that **no Claude Code session loads**, and said nothing, because one
exception had covered the whole subject.

**So check what the exception actually covers before you go quiet.** Here that
is two questions, not one: _may the content stay?_ — theirs, and already
answered — and _is `AGENTS.md` imported at all?_ An exception about keeping
content says nothing about the import line, and the two are independent: the
line costs nothing and loses nothing, so it is still offered, once, on its own.

⚠️ **And when the exception's own text rests on that confusion, say so plainly
and leave it alone.** An exception written as _«it is not a pointer, its content
stays»_ is answering a question the harness never asked. Point at the line that
would satisfy both readings; do not edit their declaration, and do not raise it
twice.

**What moves is what belongs in `AGENTS.md`: rules, conventions, how work is
done here** — the things every tool has to read. What is genuinely Claude Code's
may stay below the import: that rule, and the warning against reading it as
all-or-nothing, are stated once at the top of this guide.
