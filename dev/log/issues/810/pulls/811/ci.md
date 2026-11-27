# CI and advisories

## Historical failures

- PR #767 omitted the required changelog fragment. The Dependency Audit also flagged rustls 0.23.45 for `RUSTSEC-2026-0346`, `RUSTSEC-2026-0348`, and `RUSTSEC-2026-0349` in the archived log at lines 1214–1241. At the starting SHA, the root lockfile had rustls 0.23.46 and the fuzz lockfile still had 0.23.45. [Run 38890202607](https://github.com/link-assistant/router/actions/runs/38890202607).
- PRs #778, #787, #788 and #789 used the historical automated translation gate. Their listed strict TypeScript, parity and profile failures prevented Rust jobs from running. A strict gate result cannot be inferred from the later change to the four-stage manual workflow. [#778](https://github.com/link-assistant/router/pull/778), [#787](https://github.com/link-assistant/router/pull/787), [#788](https://github.com/link-assistant/router/pull/788), [#789](https://github.com/link-assistant/router/pull/789).
- PR #809 reached the Rust lane. Clippy showed type errors from fallible HMAC JWT keys and the new `NonZeroU16` dimensions required by the terminal emulator, starting at line 1539 in the archived failed-job log. Bindings, benchmarks, and fuzz jobs shared these build errors. The changelog job also failed. [Pipeline](https://github.com/link-assistant/router/actions/runs/45986555269), [bindings](https://github.com/link-assistant/router/actions/runs/45986555013), [benchmarks](https://github.com/link-assistant/router/actions/runs/45986554681), [fuzz](https://github.com/link-assistant/router/actions/runs/45986554643).
- PR #790's strict workflow reported four lint failures and TypeScript reported a missing neutral tree. The action refresh must pass the active workflow's source auditor and preserve the strict workflow's source structure. [Run 43413079455](https://github.com/link-assistant/router/actions/runs/43413079455).

## Verification for PR #811

The source changes cover blank and placeholder issuer secrets, a raw HMAC with an empty key, deployment fingerprint compatibility and terminal sizing. The PR retains storage reopen coverage. The four-stage manual JavaScript workflow is required for the exact SHA before Rust CI starts. All Rust build, Clippy, test and advisory evidence must come from hosted CI.

| Local check | Result |
| --- | --- |
| Focused Node regression and workflow-policy tests | 30 passed |
| Focused Node and Bun native tests with the Linux subreaper wrapper | 6 Node cases and 32 Bun cases passed |
| Complete active local JavaScript gate at `14dbdea8` | All four stages passed with the Linux subreaper wrapper. Node and Bun each passed 405 cases, and the TypeScript stage included all 10 Node deadline cases. |
| Public and native TypeScript checks | Both passed with TypeScript 7.0.2 |
| Admin UI production build and Rust asset synchronization | Passed with Vite 8.4 |
| Browser admin smoke test | Chromium loaded all four built chunks with HTTP 200, then signed in and out against a mock API without an uncaught page error. |
| Active workflow policy and retained matrix-draft generator | Passed |
| Archived fixed parallel workflow generator | Reproduced its source inverse failure on both the starting main source and the proposed source. The archived workflow has sharded custody while the source auditor expects both fixed matrices. |
| Archived strict workflow tests run in isolation | 30 passed and 9 failed. The archived suite includes assertions for the old gate and strict runner commands. |
| npm advisories | Zero across `js`, `ts`, `ui` and `scripts/ci` |
| Universal Python lock and Python advisories | uv lock check passed. `pip-audit` found zero advisories in the installed tool environment. The complete updated universal lock returned zero advisories in OSV. |
| Python distribution | Wheel and source distribution built |
| Python minimum supported runtime | The same 10 released-binary tests passed under Python 3.10. |
| Nix | Flake evaluation passed for the Router package, development shell, formatter and format check. Builds require hosted Rust verification. |
| Released-binary interoperability | Router v1.25.6 passed 11 JavaScript binding cases, 10 Python binding cases and the generated Go, Java and PHP round trips. The unchanged catalog generated all 368 operations in each language. |
| Composer advisories | Zero from Packagist for the committed lock |
| Generated Go and Java advisory scan | OSV found zero advisories across the probe modules, effective Java classpath and declared Java build plugins |
| Rust lockfile advisory cross-check | OSV scanned all three regenerated Cargo locks. Its only result was the informational `chrono` maintenance advisory. Hosted `cargo audit` is pending. |
| Pre-commit hooks | Ran the hook commands directly using pre-commit-hooks v6.0.0 because the pre-commit runner is absent. No Git hook bypass flags were used. |

The initial complete local manual-gate attempt hit process cleanup failures under a container PID 1 that leaves children as zombies. The focused recheck ran with [a Linux subreaper wrapper](../../../../../../experiments/issue-810/reap-test-descendants.py), which leaves the original tests and deadlines intact.

Hosted run 46002025243 at `f1298e12efc10aca87a68d28ab83c4f906d0db63` passed lint, Node and Bun. The TypeScript stage passed the deadline suite and both public declaration checks, then failed in the private compiler's source-integrity check. The downloaded job log records `Original file token context: original source operations changed` at line 374. The same failure reproduces under local Node 26.13.1 and 24.22.3. The Node 22.23.5 probe also shows that its `isProxy` function has the anonymous native representation. Under Node 20.20.2, the two pristine-source guards pass and strict compilation covers all 188 files with TypeScript 5.9.3. The TypeScript stage now pins that runtime. The three other stages retain the current Node release. [Hosted check 46002025243](https://github.com/link-assistant/router/actions/runs/46002025243).

At `14dbdea882511262c90889ef18e044332d6b9b8d`, all four hosted JavaScript stages passed and the same-commit gate authorized hosted Cargo. Cargo 1.100.0 resolved the root, fuzz and active sharder locks. The root and fuzz locks now both resolve rustls 0.23.46. The artifact's SHA-256 is `c911f8b7801778a69205edad294e513a88436e96a49af6d23ac7276b8b2db425`. [Hosted lock run](https://github.com/link-assistant/router/actions/runs/46007063014), [Cargo job](https://github.com/link-assistant/router/actions/runs/46007063014/job/140537373394).

The current Chrono release is 0.4.45. The maintenance advisory assigns no CVSS score and lists no fixed release. Router exposes Chrono in its public operation context, while current Log Lazy depends on it and Schemars supplies the existing date-time schema. Fully removing it requires a public API migration and replacement of those dependency edges. [RustSec advisory](https://rustsec.org/advisories/RUSTSEC-2026-0543.html), [upstream maintenance discussion](https://github.com/chronotope/chrono/issues/1768).
