# Migrations and upstream findings

## Rust CI breakage from #809

`jsonwebtoken` 12 made its symmetric key constructors fallible to reject empty signing and verification keys. Router now passes key creation errors through the existing issuer errors. The deployment fingerprint code needs a raw HMAC that can accept arbitrary bytes, including an empty key. It now uses RustCrypto's `hmac` with `sha2`, both already part of the JWT crypto dependency tree. The local secret digest delegates to the same function and keeps its 128-bit output truncation. [JWT changelog](https://github.com/Keats/jsonwebtoken/blob/v12.0.0/CHANGELOG.md), [RustCrypto HMAC](https://docs.rs/hmac/0.13.0/hmac/).

`vt100` 0.18 accepts nonzero row and column counts. The built-in PTY size now carries that invariant in the private constants and exposes the existing public `u16` dimensions. [Parser API](https://docs.rs/vt100/0.18.1/vt100/struct.Parser.html).

`link-cli` 3.2 supplies a safe reopen API for existing mapped storage. Router now uses it and keeps the existing-length floor around the Doublets bootstrap request. The upstream bootstrap still asks the allocator to shrink an existing map before reading its persisted header. The issue includes the affected versions, source trace, a standalone source-derived reproduction, and a proposed initialization fix. [Mapped storage API](https://docs.rs/link-cli/3.2.1/link_cli/mem/struct.FileMapped.html), [Doublets #97](https://github.com/linksplatform/doublets-rs/issues/97).

The release and fixture scripts now use `ureq` 3's response body and `http` status and header APIs. The vendor fixture recorder still records bodies for error statuses and replaces duplicate outbound headers. [ureq 2-to-3 migration guide](https://github.com/algesten/ureq/blob/main/MIGRATE-2-to-3.md).

## TypeScript

TypeScript 7 uses a native compiler and no longer exposes the JavaScript Compiler API through `typescript`. The translator depends on that API and many source profiles pin TypeScript 5.9.3. Microsoft offers `@typescript/typescript6` as a compatibility path for the legacy API. Moving the compiler host requires migrating and requalifying the affected source profiles with the new API runtime. [TypeScript 7 release and migration notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).

Both public declaration checks use TypeScript 7.0.2. The separately installed translator compiler retains its legacy API and exact version. The UI's Vite configuration now uses Rolldown's `codeSplitting.groups` and preserves the three groups and their load order. [Vite migration guide](https://vite.dev/guide/migration.html), [Rolldown output options](https://rolldown.rs/reference/output-options).

## Generated HTTP clients

The Go probe uses a committed module and checks that `go mod tidy` would produce the same files. The PHP probe uses a committed Composer lock and current PHPUnit and Guzzle, with a PHP 8.5 minimum. Java targets the Java 17 API for JUnit 6, uses the JVM OkHttp artifact, and generates Jakarta imports before pinning the corresponding Jakarta dependencies. [Generator v7.28.0](https://github.com/OpenAPITools/openapi-generator/releases/tag/v7.28.0), [JUnit 6 migration guide](https://docs.junit.org/current/user-guide/#migrating-from-junit5), [PHPUnit 13 migration guide](https://phpunit.de/announcements/phpunit-13.html), [OkHttp Maven usage](https://square.github.io/okhttp/).

## Available tooling

Cargo and npm can refresh transitive versions within existing constraints. Major versions require manifest and caller updates. uv produces a universal Python lock. The repository uses Dependabot for npm, Cargo, uv, Docker, GitHub Actions, pre-commit, Go, Composer and Nix. Renovate also supports flake inputs and can extract custom pins. [Dependabot ecosystem support](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories), [Renovate Nix manager](https://docs.renovatebot.com/modules/manager/nix/).
