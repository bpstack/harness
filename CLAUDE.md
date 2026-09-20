@AGENTS.md

<!-- template-only: The pointer. Copied as-is, with nothing to fill in.

     Why it exists: Claude Code reads AGENTS.md on its own from v2.1.277, but
     only where no CLAUDE.md sits in the working directory or above it — so
     this file would hide AGENTS.md if it did not import it. It is kept, rather
     than deleted, because the import is the only shape that also works in the
     sessions that cannot read AGENTS.md natively, and because it is what makes
     the load visible in /context. ADR-035. A symlink is not the answer — on
     Windows it requires developer mode.

     Why one line and not a copy: two files with the same content drift apart,
     and the worst case measured had 266 lines duplicated by hand.

     The only thing that may be added below is content **specific** to Claude
     Code that does not apply to the other harness. Never content copied from
     AGENTS.md. -->
