# ASVS v5.0.0 — V9 Self-contained Tokens

> **Requirement index for chapter V9 — Self-contained Tokens.** Every entry
> carries an id ready to cite (`v5.0.0-<chapter>.<section>.<req>`), the level
> `L` at which it becomes mandatory — an L2 project meets L1 and L2 — and the
> official text, which is what gets cited (rule in `asvs.md` §5).
>
> **OWASP Application Security Verification Standard 5.0.0** (May 2025), ©
> 2008-2025 The OWASP Foundation, licensed **CC BY-SA 4.0** —
> <https://creativecommons.org/licenses/by-sa/4.0/>. Adapted with attribution,
> shared alike. Source: the official CSV of tag `v5.0.0` —
> <https://github.com/OWASP/ASVS/tree/v5.0.0>. Generated from that source; do
> not edit by hand.

## V9.1 — Token source and integrity

- **v5.0.0-9.1.1** (L1) Verify that self-contained tokens are validated using
  their digital signature or MAC to protect against tampering before accepting
  the token's contents.
- **v5.0.0-9.1.2** (L1) Verify that only algorithms on an allowlist can be used
  to create and verify self-contained tokens, for a given context. The allowlist
  must include the permitted algorithms, ideally only either symmetric or
  asymmetric algorithms, and must not include the 'None' algorithm. If both
  symmetric and asymmetric must be supported, additional controls will be needed
  to prevent key confusion.
- **v5.0.0-9.1.3** (L1) Verify that key material that is used to validate
  self-contained tokens is from trusted pre-configured sources for the token
  issuer, preventing attackers from specifying untrusted sources and keys. For
  JWTs and other JWS structures, headers such as 'jku', 'x5u', and 'jwk' must be
  validated against an allowlist of trusted sources.

## V9.2 — Token content

- **v5.0.0-9.2.1** (L1) Verify that, if a validity time span is present in the
  token data, the token and its content are accepted only if the verification
  time is within this validity time span. For example, for JWTs, the claims
  'nbf' and 'exp' must be verified.
- **v5.0.0-9.2.2** (L2) Verify that the service receiving a token validates the
  token to be the correct type and is meant for the intended purpose before
  accepting the token's contents. For example, only access tokens can be
  accepted for authorization decisions and only ID Tokens can be used for
  proving user authentication.
- **v5.0.0-9.2.3** (L2) Verify that the service only accepts tokens which are
  intended for use with that service (audience). For JWTs, this can be achieved
  by validating the 'aud' claim against an allowlist defined in the service.
- **v5.0.0-9.2.4** (L2) Verify that, if a token issuer uses the same private key
  for issuing tokens to different audiences, the issued tokens contain an
  audience restriction that uniquely identifies the intended audiences. This
  will prevent a token from being reused with an unintended audience. If the
  audience identifier is dynamically provisioned, the token issuer must validate
  these audiences in order to make sure that they do not result in audience
  impersonation.
