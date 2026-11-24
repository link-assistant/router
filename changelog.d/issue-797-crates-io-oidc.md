Publish the crate to crates.io with OIDC trusted publishing: the stable
finalization job (also used by registry retries) gets `id-token: write` and
exchanges it via `rust-lang/crates-io-auth-action` for a short-lived token, with
`CARGO_REGISTRY_TOKEN`/`CARGO_TOKEN` kept only as a fallback until the first OIDC
release is verified. Stale 2026-11-01 native profile translation archives now
warn instead of failing release CI (automated translation is temporarily not
required), `url` is bumped to 2.5.9 (RUSTSEC-2026-0592) and `cookie` to 0.18.3
(RUSTSEC-2026-0594).
