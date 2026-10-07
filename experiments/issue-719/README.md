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
```

If the complete unit-test binary exceeds the machine's available memory:

```sh
python3 experiments/issue-719/reproduce.py
```

The script copies `src` into a temporary project and disables unrelated test
modules and entry points in that copy. Production code and fixture helpers are
preserved; the repository's source is untouched. It reuses `target`, uses one
build job, and omits debug information for Router alone. This focused run
complements the full `cargo test --locked --all-features` suite.

Before the fix, the known-model fixture returned 404 `not_found_error`, the
strictly pinned rejected pool account returned 502 `api_error`, and consumed
local errors had no `client_response_body` record. Credential replacement
already passed and remains covered. The fixed results are 503
`account_unavailable`, redacted local response records, and unchanged exact
models for healthy credentials.
