# Provider connector conformance

Issue #726 asks for a shared lifecycle before onboarding additional providers.
The baseline has independent credential acceptance, refresh, catalog and pool
modules, with no importable `ProviderConnector` contract or onboarding checklist.

The new integration fixture was added before exporting the contract; the initial
build fails to import `link_assistant_router::provider_connector`. The feature
adapts the existing components, so its acceptance test then runs against real
Claude/Codex credential layouts and a loopback mock rather than fake adapter
methods.

```sh
cargo test --locked --test provider_connector_conformance_test -- --nocapture
```

Both providers run the same lifecycle assertions directly and through an
explicit mock egress proxy. The proxied destinations use `connector.invalid`:
successful login completion, refresh and catalog retrieval prove the configured
proxy carried the requests without resolving or dialing the destination
directly. No vendor credentials, external API calls, or paid inference are used.

The fixture verifies native-login document completion and rejected-candidate
rollback, proactive refresh and durable reread, exact catalog IDs/metadata,
429 cooldown and retry classification, external refresh ownership, refusal of
private token/catalog destinations, guarded DNS answers, redirects and failed
proxy configuration. Native authorization initiation retains its existing
`claude_auth_test`, `codex_auth_test` and native acceptance unit coverage.

The transport's remote-proxy DNS limitation is documented in
[`docs/providers/onboarding.md`](../../docs/providers/onboarding.md).
Consumer entitlement policy is unchanged; passing conformance never enables a
new subscription or bridge.

On a small Linux workspace the repository's existing finite-memory helper can
run the same fixture, saving compiler and test output for review:

```sh
mkdir -p ci-logs
RUSTC_WRAPPER="$PWD/experiments/issue-703/rustc_memory_wrapper.py" \
python3 experiments/issue-719/bounded-build.py cargo test --locked \
  --test provider_connector_conformance_test > ci-logs/connector.log 2>&1
```

For the combined unit suite, run the existing syntax-tree sharder and the
bounded runner to execute all enabled
unit tests, retaining a fresh test-name inventory instead of assuming an old
revision's test count. CI still compiles and runs the original suite.

```sh
rust-script experiments/issue-703/shard-unit-tests.rs
python3 experiments/issue-726/verify-unit-shards.py
```
