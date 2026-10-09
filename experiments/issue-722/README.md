# Management access hardening reproduction

The minimum HTTP regressions are the first two tests in
`tests/management_security_test.rs`. They inject a socket peer, so forwarded
headers cannot supply or replace the client identity. Run them with:

```sh
cargo test --test management_security_test fifth_failure_bans
cargo test --test management_security_test combined_listener_blocks
```

Before the fix, the fifth consecutive rejected credential returned `401`
instead of `429`, and a remote management request with valid admin credentials
returned `200` instead of `403`. Both failures were observed before changing
the authentication and listener implementation.

The complete regression target also checks independent client addresses,
`Retry-After`, forwarding-header rotation, shared listeners, successful auth
reset, bootstrap confirmation, loopback recovery, disabled lockout, audit
redaction, doctor output, example-secret refusal (including secret files),
and real HTTP/TLS peer extraction and expiry:

```sh
cargo test --test management_security_test
cargo test --lib management_access
cargo test --lib management_config
```

Unit tests advance explicit `Instant` values to test expiry without sleeping.
The capacity probe uses a finite 4096-entry tracker; the concurrency probe
uses 16 threads. CLI children have a 10-second deadline and are killed and
reaped on failure. The live loopback listener test has request deadlines and
joins both server shutdowns.
