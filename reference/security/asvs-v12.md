# ASVS v5.0.0 — V12 Secure Communication

> **Requirement index for chapter V12 — Secure Communication.** Every entry
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

## V12.1 — General TLS Security Guidance

- **v5.0.0-12.1.1** (L1) Verify that only the latest recommended versions of the
  TLS protocol are enabled, such as TLS 1.2 and TLS 1.3. The latest version of
  the TLS protocol must be the preferred option.
- **v5.0.0-12.1.2** (L2) Verify that only recommended cipher suites are enabled,
  with the strongest cipher suites set as preferred. L3 applications must only
  support cipher suites which provide forward secrecy.
- **v5.0.0-12.1.3** (L2) Verify that the application validates that mTLS client
  certificates are trusted before using the certificate identity for
  authentication or authorization.
- **v5.0.0-12.1.4** (L3) Verify that proper certification revocation, such as
  Online Certificate Status Protocol (OCSP) Stapling, is enabled and configured.
- **v5.0.0-12.1.5** (L3) Verify that Encrypted Client Hello (ECH) is enabled in
  the application's TLS settings to prevent exposure of sensitive metadata, such
  as the Server Name Indication (SNI), during TLS handshake processes.

## V12.2 — HTTPS Communication with External Facing Services

- **v5.0.0-12.2.1** (L1) Verify that TLS is used for all connectivity between a
  client and external facing, HTTP-based services, and does not fall back to
  insecure or unencrypted communications.
- **v5.0.0-12.2.2** (L1) Verify that external facing services use publicly
  trusted TLS certificates.

## V12.3 — General Service to Service Communication Security

- **v5.0.0-12.3.1** (L2) Verify that an encrypted protocol such as TLS is used
  for all inbound and outbound connections to and from the application,
  including monitoring systems, management tools, remote access and SSH,
  middleware, databases, mainframes, partner systems, or external APIs. The
  server must not fall back to insecure or unencrypted protocols.
- **v5.0.0-12.3.2** (L2) Verify that TLS clients validate certificates received
  before communicating with a TLS server.
- **v5.0.0-12.3.3** (L2) Verify that TLS or another appropriate transport
  encryption mechanism used for all connectivity between internal, HTTP-based
  services within the application, and does not fall back to insecure or
  unencrypted communications.
- **v5.0.0-12.3.4** (L2) Verify that TLS connections between internal services
  use trusted certificates. Where internally generated or self-signed
  certificates are used, the consuming service must be configured to only trust
  specific internal CAs and specific self-signed certificates.
- **v5.0.0-12.3.5** (L3) Verify that services communicating internally within a
  system (intra-service communications) use strong authentication to ensure that
  each endpoint is verified. Strong authentication methods, such as TLS client
  authentication, must be employed to ensure identity, using public-key
  infrastructure and mechanisms that are resistant to replay attacks. For
  microservice architectures, consider using a service mesh to simplify
  certificate management and enhance security.
