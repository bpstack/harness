# ASVS v5.0.0 — V11 Cryptography

> **Requirement index for chapter V11 — Cryptography.** Every entry carries an
> id ready to cite (`v5.0.0-<chapter>.<section>.<req>`), the level `L` at which
> it becomes mandatory — an L2 project meets L1 and L2 — and the official text,
> which is what gets cited (rule in `asvs.md` §5).
>
> **OWASP Application Security Verification Standard 5.0.0** (May 2025), ©
> 2008-2025 The OWASP Foundation, licensed **CC BY-SA 4.0** —
> <https://creativecommons.org/licenses/by-sa/4.0/>. Adapted with attribution,
> shared alike. Source: the official CSV of tag `v5.0.0` —
> <https://github.com/OWASP/ASVS/tree/v5.0.0>. Generated from that source; do
> not edit by hand.

## V11.1 — Cryptographic Inventory and Documentation

- **v5.0.0-11.1.1** (L2) Verify that there is a documented policy for management
  of cryptographic keys and a cryptographic key lifecycle that follows a key
  management standard such as NIST SP 800-57. This should include ensuring that
  keys are not overshared (for example, with more than two entities for shared
  secrets and more than one entity for private keys).
- **v5.0.0-11.1.2** (L2) Verify that a cryptographic inventory is performed,
  maintained, regularly updated, and includes all cryptographic keys,
  algorithms, and certificates used by the application. It must also document
  where keys can and cannot be used in the system, and the types of data that
  can and cannot be protected using the keys.
- **v5.0.0-11.1.3** (L3) Verify that cryptographic discovery mechanisms are
  employed to identify all instances of cryptography in the system, including
  encryption, hashing, and signing operations.
- **v5.0.0-11.1.4** (L3) Verify that a cryptographic inventory is maintained.
  This must include a documented plan that outlines the migration path to new
  cryptographic standards, such as post-quantum cryptography, in order to react
  to future threats.

## V11.2 — Secure Cryptography Implementation

- **v5.0.0-11.2.1** (L2) Verify that industry-validated implementations
  (including libraries and hardware-accelerated implementations) are used for
  cryptographic operations.
- **v5.0.0-11.2.2** (L2) Verify that the application is designed with crypto
  agility such that random number, authenticated encryption, MAC, or hashing
  algorithms, key lengths, rounds, ciphers and modes can be reconfigured,
  upgraded, or swapped at any time, to protect against cryptographic breaks.
  Similarly, it must also be possible to replace keys and passwords and
  re-encrypt data. This will allow for seamless upgrades to post-quantum
  cryptography (PQC), once high-assurance implementations of approved PQC
  schemes or standards are widely available.
- **v5.0.0-11.2.3** (L2) Verify that all cryptographic primitives utilize a
  minimum of 128-bits of security based on the algorithm, key size, and
  configuration. For example, a 256-bit ECC key provides roughly 128 bits of
  security where RSA requires a 3072-bit key to achieve 128 bits of security.
- **v5.0.0-11.2.4** (L3) Verify that all cryptographic operations are
  constant-time, with no 'short-circuit' operations in comparisons,
  calculations, or returns, to avoid leaking information.
- **v5.0.0-11.2.5** (L3) Verify that all cryptographic modules fail securely,
  and errors are handled in a way that does not enable vulnerabilities, such as
  Padding Oracle attacks.

## V11.3 — Encryption Algorithms

- **v5.0.0-11.3.1** (L1) Verify that insecure block modes (e.g., ECB) and weak
  padding schemes (e.g., PKCS#1 v1.5) are not used.
- **v5.0.0-11.3.2** (L1) Verify that only approved ciphers and modes such as AES
  with GCM are used.
- **v5.0.0-11.3.3** (L2) Verify that encrypted data is protected against
  unauthorized modification preferably by using an approved authenticated
  encryption method or by combining an approved encryption method with an
  approved MAC algorithm.
- **v5.0.0-11.3.4** (L3) Verify that nonces, initialization vectors, and other
  single-use numbers are not used for more than one encryption key and
  data-element pair. The method of generation must be appropriate for the
  algorithm being used.
- **v5.0.0-11.3.5** (L3) Verify that any combination of an encryption algorithm
  and a MAC algorithm is operating in encrypt-then-MAC mode.

## V11.4 — Hashing and Hash-based Functions

- **v5.0.0-11.4.1** (L1) Verify that only approved hash functions are used for
  general cryptographic use cases, including digital signatures, HMAC, KDF, and
  random bit generation. Disallowed hash functions, such as MD5, must not be
  used for any cryptographic purpose.
- **v5.0.0-11.4.2** (L2) Verify that passwords are stored using an approved,
  computationally intensive, key derivation function (also known as a "password
  hashing function"), with parameter settings configured based on current
  guidance. The settings should balance security and performance to make
  brute-force attacks sufficiently challenging for the required level of
  security.
- **v5.0.0-11.4.3** (L2) Verify that hash functions used in digital signatures,
  as part of data authentication or data integrity are collision resistant and
  have appropriate bit-lengths. If collision resistance is required, the output
  length must be at least 256 bits. If only resistance to second pre-image
  attacks is required, the output length must be at least 128 bits.
- **v5.0.0-11.4.4** (L2) Verify that the application uses approved key
  derivation functions with key stretching parameters when deriving secret keys
  from passwords. The parameters in use must balance security and performance to
  prevent brute-force attacks from compromising the resulting cryptographic key.

## V11.5 — Random Values

- **v5.0.0-11.5.1** (L2) Verify that all random numbers and strings which are
  intended to be non-guessable must be generated using a cryptographically
  secure pseudo-random number generator (CSPRNG) and have at least 128 bits of
  entropy. Note that UUIDs do not respect this condition.
- **v5.0.0-11.5.2** (L3) Verify that the random number generation mechanism in
  use is designed to work securely, even under heavy demand.

## V11.6 — Public Key Cryptography

- **v5.0.0-11.6.1** (L2) Verify that only approved cryptographic algorithms and
  modes of operation are used for key generation and seeding, and digital
  signature generation and verification. Key generation algorithms must not
  generate insecure keys vulnerable to known attacks, for example, RSA keys
  which are vulnerable to Fermat factorization.
- **v5.0.0-11.6.2** (L3) Verify that approved cryptographic algorithms are used
  for key exchange (such as Diffie-Hellman) with a focus on ensuring that key
  exchange mechanisms use secure parameters. This will prevent attacks on the
  key establishment process which could lead to adversary-in-the-middle attacks
  or cryptographic breaks.

## V11.7 — In-Use Data Cryptography

- **v5.0.0-11.7.1** (L3) Verify that full memory encryption is in use that
  protects sensitive data while it is in use, preventing access by unauthorized
  users or processes.
- **v5.0.0-11.7.2** (L3) Verify that data minimization ensures the minimal
  amount of data is exposed during processing, and ensure that data is encrypted
  immediately after use or as soon as feasible.
