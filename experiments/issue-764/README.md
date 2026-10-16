# Marketplace reproduction and validation

The original ActivityPub outbox always returned zero items and the inbox
accepted arbitrary activities. `reproduce.py` extracts the original outbox
builder from the issue branch's starting commit and confirms that a model
publication assertion fails. Run it with `python3 experiments/issue-764/reproduce.py`.
The generated baseline crate is disposable and uses a single Cargo job.

The replacement protocol tests are in `tests/activitypub_marketplace_test.rs`.
An additional regression reproduced rejection of JSON numeric quantities
equivalent to the string amounts in the FEP examples. The comparison now
normalizes those values and emits canonical, standard quantity fields.
The client-scoped HTTP discovery, negotiation and linked inference tests are
in `src/model_routing_provider_tests.rs` (the `marketplace_` tests). They use
finite local upstream fixtures and do not require external credentials.

`test_release_type.py` checks that only a newly added major changelog fragment
allows breaking public Rust API changes in the compatibility job.

The initial pipeline run [38853182889](https://github.com/link-assistant/router/actions/runs/38853182889)
tested starting commit `fa0169f0f`, before the marketplace implementation.
Its dependency audit failed with seven advisories: three against quinn-proto
0.11.17 and four against rustls 0.23.45. The preserved log identifies the
failures at lines 3714–3833. Their recommended patch releases are 0.11.18
and 0.23.46 respectively. The lockfile upgrades those two dependencies.

Local logs are kept alongside this file and ignored by Git. The protocol
test target passes. The large library test build was stopped at about
2.5 GiB RSS under the container's 2.92 GiB total memory limit; CI provides
the remaining library/HTTP test validation.

The first implementation CI run also found a stale CLI help fixture:
`ci-logs/job-116831184464.log:6636` still required retired Gonka environment
variables in help. Both marketplace HTTP tests passed in that run (lines
5143–5144). The fixture now checks only supported secret settings, with a
separate assertion that retired settings and their values remain absent.

On `09c16cca4`, all Linux tests passed, including 2,161 library tests. The
instrumented suite also passed and measured 79,498 / 91,100 covered lines
(87.264544%). Coverage CI required committing the increased ratchet baseline
(`ci-logs/coverage-116835754209.log:8020–8062`). The baseline is advanced using
the uploaded summary and the repository's own coverage checker.
