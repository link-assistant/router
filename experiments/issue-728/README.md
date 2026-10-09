# Management observability regression checks

The initial request lookup reproduction wrote two phases for one id and an
unrelated request to `requests.lino`, reopened the log store, and retrieved the
id through the production admin router. Before implementation, the response
was 404 instead of 200. The regression test now verifies both persisted phases.

```sh
cargo test --test management_security_test request_by_id_round_trip
cargo test --test observability_test
```

The streaming regression sends a tiny synthetic upstream response through the
request middleware. It checks counts before consumption, after consumption,
and after cancellation, for ordinary and native service routes. Native routes
previously reported zero while the response body was still active. Tracking
now retains the entry through the native response body without inspecting its
frames.

The observability suite also exercises every endpoint's admin boundary,
default-disabled capture, oldest-file eviction, redaction, downloads, private
permissions, symlink rejection, bounded and abandoned bodies, and clearing
in-flight captures. A child server with `RUST_LOG=warn` and a one-second debug
lease verifies the PATCH endpoint, automatic expiry, audit events, operational
events, and environment-based capture configuration. All upstreams used by
these tests are local and synthetic.

```sh
cargo test --lib logging::runtime_debug
cargo test --lib doctor::latest_version
cargo test --lib native_upstream_errors_use_opt_in_capture
cargo fmt --all -- --check
cargo clippy --locked --all-targets --all-features -- -D warnings
python3 scripts/generate-contracts.py --check
python3 scripts/generate-bindings.py --check
```

The version-check unit test uses a local release API fixture. The production
endpoint uses the fixed public GitHub release URL with a bounded response and
request timeout. Router currently dispatches without an application queue;
the queue response therefore reports `queued: 0` and counts active exchanges
per selected account instead of inventing pending work.
