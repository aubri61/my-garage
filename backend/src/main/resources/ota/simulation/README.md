# Simulation-only OTA fixtures

These checked-in Ed25519 keys were generated only for the educational My Garage OTA lab.
They are PUBLIC TEST FIXTURES, not secrets or production credentials. Never reuse them for real signing.
The verification engine pins only publisher-public.x509.base64. The scenario generator uses the two
private fixtures to construct reproducible legitimate and forged packages. No request-supplied keys are trusted.
PKCS#8 private-key encoding and X.509 SubjectPublicKeyInfo public-key encoding do not constitute
X.509 certificate-chain validation. No certificate, revocation or rotation functionality is implemented.

Baseline: manufacturer/model from the owned vehicle, hardware SIM-HW-{modelYear}, component
INFOTAINMENT, software 1.0.0, security counter 10. Every run uses this unchanged virtual baseline.
Versions use three nonnegative integer segments (0..999999), without prerelease/build suffixes.
Updates must increase software version and must not decrease the security counter (equal is permitted).
Verification order is format, trusted signer, signature, file integrity, compatibility, component/version,
rollback. The first failure wins; subsequent checks are NOT_RUN.

Signed protocol v1: fixed field order, UTF-8 strings with a 32-bit big-endian byte-length prefix:
domain MY_GARAGE_OTA_METADATA_V1, updateId, manufacturer, model, hardwareId, component, version;
then securityVersion as a 64-bit big-endian integer; then length-prefixed fileHash and signerKeyId.
SHA-256 hashes the raw file bytes. Ed25519 signs these metadata bytes, including the expected file hash.
No JSON ordering dependency or unsigned policy field is involved.

The OFF comparison still computes the engine's verdict internally to describe hypothetical risk,
but returns all displayed checks as NOT_RUN and SIMULATED_APPROVAL, never actual installation approval.
Neither ON nor OFF changes any vehicle or executes firmware. Only audit history is persisted.
