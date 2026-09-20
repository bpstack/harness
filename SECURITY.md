# Security

**Report a vulnerability privately**, never in a public issue:
[open a draft advisory](https://github.com/bpstack/harness/security/advisories/new)
on this repository.

**No bounty, and no promised response time.** This is one person’s repository: a
report is read when it is read, and fixed if it is real.

## What is worth reporting

This harness is scripts and text. It runs on the machine of whoever installs it,
serves no traffic, holds no account and stores nobody's data — so what matters
is **what it writes**: a path it touches outside the repository it was pointed
at, a file it deletes without the harness mark, or anything private that reaches
a file meant to be published.

`reference/security/` is OWASP's ASVS, adapted under CC BY-SA 4.0. Errors in the
standard itself go to [OWASP](https://github.com/OWASP/ASVS), not here.

## Supported

The latest commit on `main`. There are no releases and no backports.
