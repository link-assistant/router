# CI and advisories

## Historical failures

- PR #767 omitted the required changelog fragment. The Dependency Audit also flagged rustls 0.23.45 for `RUSTSEC-2026-0346`, `RUSTSEC-2026-0348`, and `RUSTSEC-2026-0349` in the archived log at lines 1214–1241. At the starting SHA, the root lockfile had rustls 0.23.46 and the fuzz lockfile still had 0.23.45. [Run 38890202607](https://github.com/link-assistant/router/actions/runs/38890202607).
- PRs #778, #787, #788 and #789 used the historical automated translation gate. Their listed strict TypeScript, parity and profile failures prevented Rust jobs from running. A strict gate result cannot be inferred from the later change to the four-stage manual workflow. [#778](https://github.com/link-assistant/router/pull/778), [#787](https://github.com/link-assistant/router/pull/787), [#788](https://github.com/link-assistant/router/pull/788), [#789](https://github.com/link-assistant/router/pull/789).
- PR #809 reached the Rust lane. Clippy showed type errors from fallible HMAC JWT keys and the new `NonZeroU16` dimensions required by the terminal emulator, starting at line 1539 in the archived failed-job log. Bindings, benchmarks, and fuzz jobs shared these build errors. The changelog job also failed. [Pipeline](https://github.com/link-assistant/router/actions/runs/45986555269), [bindings](https://github.com/link-assistant/router/actions/runs/45986555013), [benchmarks](https://github.com/link-assistant/router/actions/runs/45986554681), [fuzz](https://github.com/link-assistant/router/actions/runs/45986554643).
- PR #790's strict workflow reported four lint failures and TypeScript reported a missing neutral tree. The action refresh must pass the active workflow's source auditor and preserve the strict workflow's source structure. [Run 43413079455](https://github.com/link-assistant/router/actions/runs/43413079455).

## Verification for PR #811

Source changes to JWT handling, deployment fingerprints and terminal dimensions have been drafted. A JavaScript case and Rust cases cover blank and placeholder issuer secrets and a raw HMAC with an empty key. No Rust tools run locally. The four-stage manual JavaScript workflow is required for the exact SHA before Rust CI starts. This lane provides no strict translation or parity result.
