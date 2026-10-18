# Init-project — files git ignores

Read when the generator reports that git ignores one of the files it is about to
create. Act on it before `--apply`.

The generator asked **git** — not the `.gitignore` — which of the files it is
about to create fall under an ignore pattern, and printed the pattern with its
line. **Act on it before `--apply`.**

🔴 **This is the quietest of the failures.** The file lands here, so nothing
breaks and nobody suspects; on the next clone it is simply absent, with no error
on either side. _Measured on a real repo on 2026-09-08: the generator reported
writing `CLAUDE.md` and `git status` never listed it._

⚠️ **What an absent `CLAUDE.md` costs has shrunk, and not to zero.** Claude Code
reads `AGENTS.md` on its own from **v2.1.277**, so a clone that lacks
`CLAUDE.md` entirely is read correctly on a current version — an absent file is
the one case the native path covers. What it does not cover is the sessions that
cannot use it: a version below that, a provider that fetches no feature flags
such as Bedrock, telemetry off, hooks disabled. There the clone reads no harness
at all, and nothing says so. `docs/DECISIONS.md` under an ignore pattern has no
such fallback.

**Ask the owner, with the exact line in front of them:**

> `.gitignore:34:CLAUDE.md` keeps `CLAUDE.md` out of git. Remove that pattern so
> the harness travels, or keep this harness local to this machine?

| Answer                | What you do                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| remove the pattern    | show the line, edit `.gitignore`, re-run the dry run to confirm the warning is gone, then `--apply` |
| keep it local         | **respect it.** Apply as is, and note in the harness that these files do not travel                 |
| the pattern is needed | propose **narrowing** it (`docs/build/` rather than `docs/`) instead of deleting it                 |

🔴 **A "no" is a legitimate answer, not an obstacle to work around.** Wanting
the harness only on the machine it is written on is a real case — and a public
repo whose owner keeps their `CLAUDE.md` out of it is another. Do not ask twice
in the same session, and do not apply it anyway.

🔴 **Never edit a `.gitignore` without being told to in that exact exchange.** A
general permission to run this command is not permission to change what someone
else's repo publishes.

**And `skills-lock.json` is asked separately, because it is the other way
round.** Rule 16 wants it **committed** while `.claude/` and `.agents/` stay
ignored — skills rebuild from that lock, so hiding it leaves every other machine
rebuilding something else, or nothing.

⏱️ **Its timing is the point: the warning lands before step 6.** The lock does
not exist yet, so removing the pattern now means it is **born versioned** rather
than rescued afterwards. Raise it here, not once the skills are installed.

_Measured on a real repo on 2026-09-08: `.claude/` and `.agents/` were ignored —
correctly — and the lock was ignored too, which is the rule exactly backwards.
Neither the foundations list nor the ignore check above had anything to say,
because this script does not write that file._ A declared exception is a
legitimate answer here too.
