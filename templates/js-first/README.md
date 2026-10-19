# JavaScript first CI standard

Copy `javascript-first.yml` into `.github/workflows/` and customize the named
commands for the project's native JavaScript package, strict behavior parity
checker, and both translation directions. Keep the seven unconditional jobs and
`complete` aggregate; missing implementations must fail strict parity rather than
turn an inventory manifest into evidence of full parity.

Every workflow capable of invoking Rust (including Docker builds, tool installs,
releases, scheduled tests and manual jobs) calls the reusable gate with an
immutable SHA and makes every runner job depend directly on the gate:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false
jobs:
  javascript:
    uses: ./.github/workflows/javascript-first.yml
    with:
      sha: ${{ github.sha }}
  rust:
    needs: [javascript]
    if: needs.javascript.result == 'success'
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          ref: ${{ github.sha }}
      - run: cargo test --locked
```

For an existing job condition, preserve it inside parentheses after the explicit
success guard. In particular `always()` may not bypass the success dependency.
Do not filter or condition the JavaScript gate; a Rust-only change still has to
pass parity and regeneration. Cancelled, skipped or failing JavaScript stages
fail the aggregate and skip Rust.

A release job which creates a new version commit must resolve its tag to a SHA
using a Node/shell-only job, call the JavaScript gate again for that exact SHA,
and use that same SHA when checking out release build source. Benchmark base
compilation needs the same treatment for the historical base SHA. Historical
source lacking the required checks fails closed; it does not receive an exception.

Run `npm ci --prefix scripts/ci --ignore-scripts`, then
`node --test scripts/test/check-js-first-workflows.test.mjs` and
`node scripts/check-js-first-workflows.mjs`. The checker audits every job to catch
build commands hidden inside scripts or actions, checks direct success conditions,
forbids cancellation, and validates dynamic source gates. When adding a legitimate
source transition, add a reviewed gate mapping and a negative bypass test.

For a local preflight use `node scripts/check-js-first-local.mjs --stamp /tmp/router-js-first-gate.json`.
It executes all JavaScript checks and writes a stamp only after strict parity and
both regeneration checks pass for an unchanged commit/worktree. Native package
and CI policy dependencies must be installed first. The Rust build wrapper verifies
the stamp with `--verify-stamp` and rejects changes after it was written.

Configure branch protection to require the named JavaScript aggregate and Rust
stage check. A workflow file alone cannot configure repository branch protection.
Use one designated push agent, wait for all current runs, collect every job's
failures, repair in bulk, run the preflight, and push once per repair cycle.
