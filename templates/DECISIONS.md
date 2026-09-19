# DECISIONS — why things are the way they are

<!-- template-only: The template each project's docs/DECISIONS.md is written
     from. Copied with the header, and with the example entry deleted. -->

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

## ADR-001 — {{Title in one line, stated as a fact}}

- **Status:** 🔶 proposed ({{YYYY-MM-DD}})
- **Date:** {{YYYY-MM-DD}}
- **Decision:** {{what is done, plainly}}
- **Reason:** {{the evidence or the incident behind it — not a preference}}
- **Rejected:** {{the real alternative and why it lost. If there was none,
  delete this line: inventing one to fill the field is noise}}

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
