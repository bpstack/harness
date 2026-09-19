# ROADMAP — {{PROJECT}}

> **What it answers:** in what order the work happens, and why that order. ·
> **Who reads it:** whoever opens or closes a phase, **not every session**. ·
> **How it is pruned:** on closing a phase, its detail collapses to a result
> plus a pointer.

🔴 **Finished work leaves the plan.** The same rule holds in `TODO.md` and here;
**only where it lands changes**, depending on whether the project keeps its
reasoning anywhere. Here it **collapses to result plus pointer**: a phase leaves
behind an order and a why that still hold, and `git log` does not tell you
those. ⚠️ **Collapsing is not ticking `[x]` and leaving it**: the detail goes.

🔴 **This is not a roadmap if the order does not matter.** If you can shuffle
the points without breaking anything, what you need is a `TODO.md` — the mould
is at `~/.claude/reference/templates/TODO.md` and goes to `docs/`. A roadmap
exists because phase B **needs what A produces**, and that dependency is its
value, not the list.

## Phases

{{The table is the only part that is always read. Ten lines at most.}}

| Phase | What it produces                      | Depends on |
| ----- | ------------------------------------- | ---------- |
| 1     | {{the deliverable, not the activity}} | —          |
| 2     | {{…}}                                 | 1          |

---

## Phase 1 — {{name}} ✅ closed

{{Collapsed: **one or two lines** with what it produced and a pointer to where
that lives — a decision entry, a finding, some commits. The detail of a closed
phase is of no use to anyone: what stayed alive is in the artifact it
produced.}}

## Phase 2 — {{name}} ← **current**

{{The only one expanded. Concrete steps with checkboxes go here.}}

- [ ] {{step}} — _{{what blocks it, or what it produces}}_
- [ ] {{…}}

## Phase 3 — {{name}}

{{Not started: **three lines and no more**. Detailing a phase you have not
begun is writing fiction — you do not yet know what phase 2 will teach you.}}

<!-- Guidance, copied from the harness's ROADMAP template when this file
     was created. **Nothing rewrites it**: it is not a managed block, so
     edit it freely, or delete it once the habit is yours.

  THE THREE RULES THAT KEEP IT USEFUL, and they come from measuring it:

  1. DETAIL ONLY IN THE CURRENT PHASE. Closed ones collapsed; future ones a
     single statement. Planning phase 6 before closing phase 2 produces files
     of thousands of lines that nobody reads.
  2. ON CLOSING A PHASE, COLLAPSE IT. Result plus pointer. Whatever deserved
     keeping is already in its decision entry or its finding.
  3. ZERO INVENTORY. No modules with ✅, no stack list, no "last documented
     commit". That lives in the tree, in `git log` and in the tests — three
     sources that cannot lie, against one that someone has to remember to
     update. When the roadmap says one thing and the code another, the agent
     has to choose who to believe, and you have already lost.

  SYMPTOM THAT IT HAS DEGENERATED: thousands of lines, hundreds of headings,
  and nothing pending. That is not a plan any more, it is an inventory.

  NEVER BOTH FILES AT ONCE, unless this one stays as the index of phases and
  the TODO is the backlog of the current phase.

  SIZE: the live part — table plus current phase — fits on one screen. The
  closed part may weigh: it is not read.

-->
