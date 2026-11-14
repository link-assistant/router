---
bump: patch
---

### Security
- Update locked dependencies to fixed releases for 30 RustSec findings: `rustls` 0.23.46, `rustls-webpki` 0.103.17, `webpki-roots`/`webpki-root-certs` 1.0.12, `quinn-proto` 0.11.19, `quinn-udp` 0.5.16, `zstd` 0.14.4, `zstd-safe` 8.3.0, `zstd-sys` 2.1.3, `ctutils` 0.4.8, `rustix` 1.1.6 and `tokio` 1.53.3.
- Accept RUSTSEC-2026-0387 (`crypto-bigint` 0.5 timing) with a recorded justification: it is reachable only through `jsonwebtoken`'s elliptic-curve algorithms, while Router signs and verifies every JWT with HMAC secrets.
