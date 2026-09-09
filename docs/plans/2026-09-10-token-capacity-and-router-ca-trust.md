# Token capacity and selected-Router CA trust plan

## Goal

Deliver issues #557 and #558 together: token issuance must remain transactional at the doublets growth boundary, short-lived wrapper credentials must not accumulate without bound, and a remote CLI must be able to trust a CA associated with each selected HTTPS Router origin.

## Design

Binary token-store rebuilds remain copy-on-write. A replacement is built and validated in an independent owner-only file, dependency panics are converted into storage errors, and only a fully synced replacement is renamed over the authoritative store. Reopening an existing mapping preserves the extra element required for the highest allocated doublets address. Issuance atomically removes expired or revoked ephemeral records before inserting a new record, and a token is returned only after that transaction commits.

`router server use` accepts separate `--ca-cert` and `--management-ca-cert` paths. Valid PEM certificates are copied to content-addressed, owner-only files in Router state; the selection stores only those Router-owned names. Resolution builds distinct inference and management clients, each with the CA associated with its exact origin. Hostname, SAN, validity, and chain checks remain enabled. Wrapped Node clients receive the inference CA through `NODE_EXTRA_CA_CERTS`.

## Delivery

1. Add regressions for mapping capacity, panic-safe replacement, ephemeral compaction, structured issuance failure, CA persistence/cleanup, TLS verification, split-origin trust, and launched-client environment.
2. Implement the smallest storage and trust changes that satisfy those regressions.
3. Route health, catalog, usage, token, account, provider, and login requests through the origin-specific clients.
4. Add a patch changelog fragment, run formatting, lint, full tests, public-text/privacy checks, and dependency checks.
5. Publish the draft with intermediate commits, make it ready after verification, merge, and verify the release artifacts.
