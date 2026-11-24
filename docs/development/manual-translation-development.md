# Temporary manual translation development

On 2026-11-11 the maintainer requested suspending checks that require automated
translation and finishing translation manually; that original comment is no
longer available. On 2026-11-13 the maintainer [repeated the instruction](https://github.com/link-assistant/router/pull/785#issuecomment-6864697228):
skip those checks temporarily while preserving them in code, focus on manual
changes, make sure the router system works, and ensure all CI/CD checks pass.
The temporary development workflow implements that instruction. A passing
development run does not prove translation freshness or runtime parity. The
complete strict workflow and its original tests remain checked in.

## Active development checks

`.github/workflows/javascript-manual-development.yml` checks the exact immutable
SHA supplied by each caller, with pinned Node 20, Bun 1.4.3 and locked dependency
installation. Every active stage must succeed; skipped, cancelled and failed
stages fail the aggregate. The existing `JavaScript fully green` check name now
describes **only these temporary active development stages**:

| Stage | Complete checks retained |
| --- | --- |
| lint | JavaScript syntax, shared asset consistency, manual workflow policy and its regression file, real pipe trace regression file in Node and Bun |
| node-tests | Every existing `js/test/native-*.test.*` file under Node |
| bun-tests | Every existing `js/test/native-*.test.*` file under Bun |
| typescript | Original Node deadline-auditor regression file and deadline; public and native strict declaration tests; strict compilation of the existing native TypeScript tree; translation compiler declaration checks; UI production build |

No test files or original deadlines are shortened. TypeScript uses the installed
lockfile compiler (currently 5.9.3), with the existing strict options. Existing
native TypeScript is compiled as checked in; this lane does not regenerate it.
All original public/native runtime contracts and testing tiers remain in place.

Four lint commands came with this lane: the workflow policy regression file, the
workflow audit, and the Node and Bun runs of the pipe trace regression file. On
the caller's own commit (`inputs.sha == github.sha`, the SHA every caller's
`javascript` job passes) they always run. A caller can also check another commit:
Benchmarks checks its immutable base before benchmarking it. There, each of these
commands runs only when that commit has its file (`hashFiles(…) != ''`). A base
from before the lane cannot carry them, and the workflows in effect come from the
caller's commit, which has already passed both audits. `LANE_FILES` in
`scripts/manual-development-policy.mjs` lists these commands, and the policy test
rejects any other conditional step.

Install dependencies and run the same active commands sequentially:

```bash
npm ci --prefix scripts/ci --ignore-scripts
npm ci --prefix js --ignore-scripts
npm ci --prefix ui --ignore-scripts
node scripts/check-manual-development-local.mjs --receipt /tmp/router-manual-development.json
```

The local runner checks SHA and worktree content before and after execution,
collects failures across all four stages, and writes a **manual development
receipt**. Its `strictParity`, `fullGatePassed` and `rustAllowed` fields are false.
It cannot write a strict green gate stamp. The unchanged strict stamp verifier
and bounded Rust wrapper do not accept this receipt.

## Explicitly suspended automation

The complete original commands and deadlines remain in
`scripts/check-js-first-local.mjs` and `.github/workflows/javascript-first.yml`:

- Compiler forward and reverse whole-file receiving suites and their shard
  coordinator/freshness tests, including generated compiler registration.
- Native TypeScript regeneration and its whole regression file; generated
  TypeScript fixtures, profile/owned-definition checks, and generated
  serialization descriptor/bulk freshness and target checks.
- Strict parity and its acceptance suite.
- Canonical and owned forward generation/freshness, neutral/Unix/Windows
  profile matrices, and all reverse regeneration/freshness checks.
- Strict workflow/local-gate regression files that require the original
  automation call graph. They remain whole and are not represented as passing
  by the new development policy tests.

These checks are suspended at the caller boundary rather than changed to no-op
successes. The strict workflow remains callable by a reviewed strict caller.
Its structural audit is reused on an explicitly documented caller projection
to protect the conserved strict source policy; that audit executes no strict
stage and supplies no verification of translation.

## Rust and publication boundary

The router itself is the Rust crate, so "the router system is working" can
only be verified by running its Rust checks. The reusable manual workflow's
`rust_allowed` output is therefore derived from the aggregate job: the
`JavaScript fully green` step writes `rust_allowed=true` to `GITHUB_OUTPUT`
only after it has verified that every active stage succeeded for the same
immutable SHA. A failed, cancelled, skipped, missing or unknown stage writes
nothing, so the output stays empty and every guarded Rust/release job is
skipped. Every downstream caller job keeps its original success/dependency
conditions and additionally requires that output to be `true`; literal
`true`/`false` values are rejected by the policy audit.

Once admitted, Rust lint, tests, coverage, builds and the other existing Rust
workflows run with unchanged commands, and their failures remain fatal. The
fixed nine draft-workflow triggers and draft conditions are preserved. Local
Rust tools remain forbidden by `AGENTS.md`; the local runner's receipt keeps
`rustAllowed: false` and cannot unlock the bounded Rust wrapper.

Restore the strict caller references and remove only the additional Rust-output
guards when resuming the strict workflow. Run the complete original local gate,
its complete policy tests, and all same-SHA CI stages before claiming verified
translation. The temporary local runner, manual workflow, policy and
documentation can then be removed together.

The last strict runs still reported missing/partial parity, carried source,
stale generated outputs and original deadline failures. None is repaired or
certified by suspension. Manual translation and the remaining issue #784
privacy criteria must continue to be tracked independently.
