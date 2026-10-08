# Rejected accounts and local response logs

The hermetic fixture in `src/model_routing_failure_tests.rs` seeds an exact
two-model Claude catalog, uses temporary synthetic credentials, and sends
requests to a loopback fake upstream. Its first response rejects credential A
with 401. It checks subsequent account failures, file logs, strict account pins,
healthy credential B, credential replacement, unknown models, and invalid Router
client credentials. No vendor service or real credential is needed.

Run it normally with:

```sh
cargo test --locked --lib model_routing::evidence_tests::failure_tests
cargo test --locked --test denied_request_logging_test
cargo test --locked --test gemini_namespace_test
```

If the complete unit-test binary exceeds the machine's available memory:

```sh
python3 experiments/issue-719/reproduce.py
```

The script copies `src` into a temporary project and disables unrelated test
modules and entry points in that copy. Production code and fixture helpers are
preserved; the repository's source is untouched. It reuses `target`, uses one
build job, omits Router's debug information, and splits its code generation into
small units. This focused run
complements the full `cargo test --locked --all-features` suite.

Before the fix, the known-model fixture returned 404 `not_found_error`, the
strictly pinned rejected pool account returned 502 `api_error`, and consumed
local errors had no `client_response_body` record. Credential replacement
already passed and remains covered. The fixed results are 503
`account_unavailable`, redacted local response records, and unchanged exact
models for healthy credentials.

The Gemini namespace also checks a catalog owned by an obsolete account. That
known model must return HTTP 503 with Gemini's `UNAVAILABLE` status, safe provider
re-authentication guidance, and no upstream request. An unknown id still returns
HTTP 404 / `NOT_FOUND`. The original assertion expected 404 for both cases,
causing the Linux, macOS, Windows, and coverage jobs in CI run `37695619945` to
fail at `tests/gemini_namespace_test.rs:496`. Running that test before updating
the assertion reproduces the same 503-versus-404 failure locally.

For a bounded attempt at the unmodified full suite on a small Linux workspace:

```sh
python3 experiments/issue-719/bounded-build.py cargo test --locked --all-features \
  --config 'profile.dev.package.link-assistant-router.codegen-units=1024'
```

The wrapper uses one CPU/build job and no debug information. It stops only its
command's process group if a child exceeds 2000 MiB RSS, returning exit 125 to
distinguish the workspace limit from a test failure. Use the focused fixture
above when the full binary exceeds that bound; CI runs the unmodified suite on
Linux, macOS, and Windows without this wrapper.

Set `ROUTER_BUILD_RSS_LIMIT_MIB` to a positive MiB value to adjust the compiler
RSS bound to the workspace's available memory. The default is 2000 MiB; a
bounded local unit-shard run can use 2200 MiB when sufficient memory is available
for Cargo and the other workspace processes.
