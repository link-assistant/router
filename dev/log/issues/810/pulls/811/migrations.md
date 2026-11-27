# Migrations and upstream findings

## Rust CI breakage from #809

`jsonwebtoken` 12 made its symmetric key constructors fallible to reject empty signing and verification keys. Router now passes key creation errors through the existing issuer errors. The deployment fingerprint code needs a raw HMAC that can accept arbitrary bytes, including an empty key. It now uses RustCrypto's `hmac` with `sha2`, both already part of the JWT crypto dependency tree. The local secret digest delegates to the same function and keeps its 128-bit output truncation. [JWT changelog](https://github.com/Keats/jsonwebtoken/blob/v12.0.0/CHANGELOG.md), [RustCrypto HMAC](https://docs.rs/hmac/0.13.0/hmac/).

`vt100` 0.18 accepts nonzero row and column counts. The built-in PTY size now carries that invariant in the private constants and exposes the existing public `u16` dimensions. [Parser API](https://docs.rs/vt100/0.18.1/vt100/struct.Parser.html).

## TypeScript

TypeScript 7 uses a native compiler and no longer exposes the JavaScript Compiler API through `typescript`. The translator depends on that API and many source profiles pin TypeScript 5.9.3. Microsoft offers `@typescript/typescript6` as a compatibility path for the legacy API. Moving the compiler host requires migrating and requalifying the affected source profiles with the new API runtime. [TypeScript 7 release and migration notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).

## Available tooling

Cargo and npm can refresh transitive versions within existing constraints. Major versions require manifest and caller updates. uv can produce a Python lock covering supported Python versions. Dependabot supports npm, Cargo, Python, Docker, GitHub Actions and pre-commit. Renovate has a Nix manager for flake inputs; the repository currently uses Dependabot. [Dependabot ecosystem support](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Renovate Nix manager](https://docs.renovatebot.com/modules/manager/nix/).
