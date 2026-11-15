# Continue from the complete #771 CI evidence

The next development batch follows merged
[#771](https://github.com/link-assistant/router/pull/771) and tracks all remaining
requirements in [#772](https://github.com/link-assistant/router/issues/772).
The [throughput plan](../../../development/translation-throughput-plan.md)
prioritizes shared compatibility contracts and complete executable callers.

## Complete collected scope

The [compressed packet](../raw/ci/link-assistant--router/continuation-772/20261023-complete-ci.tar.gz)
contains complete run metadata, complete attempt job pages, the collector source,
both original run-list responses and all 139 failed/cancelled job streams for
33 completed runs. Every log was compressed losslessly and independently read
back against its original byte count and SHA-256. Every archive member was then
independently read back. The packet occupies 8,707,125 bytes and its SHA-256 is
`866b47a8ed42a917b9c9952ad443273eb46d58515e706c6e8ff31aecc4ac630e`.
The complete streams contain 35,037,815 uncompressed bytes.

The [receipt](../raw/ci/link-assistant--router/continuation-772/20261023-archive-receipt.json)
and [complete member vector](../raw/ci/link-assistant--router/continuation-772/20261023-complete-member-vector.json.gz)
retain archive and member identities. Open the archive as data; extracting or
executing its captured collector is not required for review. Literal local
paths in the original collector index remain original evidence; join each
stream portably as `complete-ci/RUN_ID/job-JOB_ID.log.gz` inside the archive.
This packet contains job logs and metadata, not downloadable workflow artifacts.

| Source SHA | Runs | Terminal jobs | Success | Failure | Cancelled | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `5c3354948dc9186a22267d576d62b950cf41407d` | 19 | 158 | 29 | 41 | 20 | 68 |
| `eb2dad1c0a18394dc1aad46413e11401e74eb502` | 14 | 162 | 40 | 52 | 26 | 44 |
| Total | 33 | 320 | 69 | 93 | 46 | 112 |

The final-PR scope includes both draft selection and ready-for-review events.
The merge scope includes push, scheduled runs and one successful dynamic
Dependabot job. That external dependency job is not evidence of the Router
JavaScript gate or Rust runtime verification. Cancelled and skipped jobs never
count as successful JavaScript stages.

## Group repairs by shared cause

The merge pipeline `39655444225` supplies concrete examples retained in full:

- Translation job `119414343435`: the stored-gain family's shared hook rejects
  the current `tools/translation/translate.mjs` fingerprint before its original
  behavioral cases run. Retain original compiler/source evidence and regenerate
  complete current fixtures through their actual producers. Updating only an
  expected checksum would not qualify the new compiler or those cases.
- TypeScript job `119414343470`: strict checking fails because the neutral
  generated output tree is absent. Produce and review the complete profile
  outputs; do not turn a missing tree into a skipped or passing check.
- Parity job `119414343590`: the inventory reports a stale
  `rust/src/translation_core.rs` hash and 441 draft gaps. Refreshing inventory
  alone cannot implement those gaps or establish runtime parity.
- Profile-matrix jobs retain full V8 allocation-failure output from a fresh
  neutral-profile child. Bounded source/storage controls do not qualify that
  complete producer. Optimize its shared work and retained data before retrying
  the unchanged full path; retain the original memory and time limits.
- Reverse job `119414343650` records successful early cases followed by
  cancellation. The incomplete file set remains red. Do not infer complete
  reverse support from the cases that happened to finish.

There were no collection or failed-log download errors in this scope. This
completeness statement does not claim that all defects are repaired. The next
published head needs its own complete results and current input census.

## Apply the smallest useful changes first

The first receiving batch derives a smaller primitive metadata dispatcher from
the complete original copier, retaining the composite source and recursive
native call expressions verbatim. An earlier prototype changed those expressions
and therefore changed Bun's native TypeError messages. The repaired source
proposal retains full native/CST inverses, fresh budgets, refusal order and
all original callback controls. Private stack equality remains outside the
existing contract; native observations are kept separate.

The shared typed-target helper also used Node's `--check` command under Bun.
Bun now uses its native complete-module scanner before the existing independent
strict TypeScript CLI and execution of both targets. Separate regressions check
duplicate bindings, absence of module execution and absence of import resolution
during syntax validation. Original receiving deadlines remain unchanged.

These changes repair shared infrastructure used by many translator cases. They
do not add production language coverage by themselves. Complete runtime parity,
current forward/reverse generation, receiving-export qualification and gated
Rust execution remain requirements of #772. No Rust tool ran locally.

The [complete local receiving packet](../raw/ci/link-assistant--router/continuation-772/20261023-complete-local-receiving.tar.gz)
and [receipt](../raw/ci/link-assistant--router/continuation-772/20261023-local-receiving-receipt.json)
retain all six complete-file results, both original Bun deadline failures,
source-declared deadline audits, resource observations and complete seven-module
native/CST source review. Node passes 39/39 cases; Bun passes 37/39. The final
producer-only blank-line correction has a full retained preimage and exact
readback; its complete four-case copier file passes again in both engines.
The packet occupies 1,336,229 bytes and all 94 members were independently read
back. It does not certify the complete JavaScript gate or a controlled speed gain.

## 2026-11-15 merge of `main` (v1.25.0) and JavaScript-first repairs

Merge commit `4f812e5ea` resolved every conflict with `main`. File-level decisions
and the reasons for them are kept in
[`experiments/merge-main-20261115/decisions.txt`](../../../../experiments/merge-main-20261115/decisions.txt).
Summary:

- Diverged translator history/pin files keep this branch's version. Generated
  meta and `js`/`ts` draft outputs keep this branch's bytes; regenerating them
  from the merged `rust/src` is still pending.
- `vendor/NOTICE.md` is back to the bytes on `main`, which the parser manifest
  pins. The paragraph this branch had added is now in
  `docs/development/translation-provenance-20261102.md`.
- Import cycles through `checked-types.mjs` were removed by moving limits and
  native key registration into dependency-free leaf modules.
- The `main` lint now walks `tools/translation`. That exposed pre-existing
  syntax breakage in drafted files that had never run: duplicate imports or
  names, raw newlines inside quoted strings, and lost brackets. All were
  repaired without changing behaviour.
- Draft native tests that had never run before were repaired. One test
  expectation now matches the Rust behaviour in `client_launch.rs`. Two
  cancellation, CRLF and inline-table bugs were found by these tests and fixed
  in both `js/src` and `ts/src`.
- The Node deadline test was timing out because its runner imported the whole
  translator just to reach one source policy. That policy now lives in
  `tools/translation/protected-source-policy-20261115.mjs`, which cut the import
  from 14 s to 0.10 s. No budget changed.
- `configure` and `with` are now partially native, so the fixtures assert their
  exact refusals instead of "not implemented".

Some failures are specific to this sandbox. Managed-daemon exit and the
owned-process-group close test fail here because PID 1 does not reap zombies;
`main` fails the same way in this sandbox. `build-js-first-ui` was not run here
because UI dependencies were not installed. Remote CI decides all of these.
Rust was checked only in remote CI. Accounting is unchanged:
12/70 DRAFTED, 58 OPEN.

### Rust CI repairs after the merge

The merge compiled drafted Rust sources and tests for the first time in CI.
Repairs used only CI logs; no Rust tool ran locally:

- The native-profile oracle gate now runs the complete manual development
  workflow audit, which also runs the original strict JavaScript-first audit
  over its conserved projection (`479da4596`).
- `cargo fmt --check` diffs were replayed exactly from CI logs with
  [`apply-rustfmt-log.mjs`](../../../../experiments/merge-main-20261115/apply-rustfmt-log.mjs).
- Parse, `must_use`, compile and clippy errors in drafted tests were repaired:
  dead code allowed where a test includes a whole module but uses part of it,
  typed empty vectors, a `cfg(all(test, unix))` import, explicit
  `#[allow(unsafe_code)]` on the target-feature oracle, a borrowed `Result`
  argument and a `$(,)?` trailing comma in `helper_case!`.

### Translator inputs made stale by the merge

`node scripts/translate-router.mjs --check` is not part of current CI, and
`main` declares automated translation suspended. It still has to pass before
bulk drafting can continue. Two independent causes break its pins:

1. `main` changed translator inputs, for example `71972481e` changed
   `tools/translation/extensions/string-iterator-runtime.mjs`, and the release
   bump changed `rust/Cargo.toml` (1.24.1 → 1.25.0), `Cargo.toml`
   (`[profile.mutants]`) and `Cargo.lock` (11 dependency versions updated).
2. The rustfmt replay changed 11 pinned Rust sources.

[`stale-pins.mjs`](../../../../experiments/merge-main-20261115/stale-pins.mjs)
lists every repository-path pin that matched the pre-merge tip but no longer
matches the tree: 199 paths. Most holders are generated outputs
(`generated/owned-definitions/*/index.json`, `parity/rust-source-inventory.json`)
that the translator write modes produce. Live pins are refreshed one at a time
with [`refresh-pin.mjs`](../../../../experiments/merge-main-20261115/refresh-pin.mjs),
which only rewrites a row that matched the pre-merge tip exactly. After the
`fresh-owned-text-vector-inputs.mjs` refresh, `--check` ran for 9 minutes and
stopped at the derive dependency proof: `source-profiles/derive/manifest.json`
pins the old Cargo manifest and lock hashes. None of the pinned derive crates
(clap, serde, schemars, syn, quote, proc-macro2, heck) changed version.

The existing producer `scripts/refresh-cargo-layout-profiles.py` only accepts
the readme/profile layout equation with an unchanged lockfile, so it refuses this
merge. The pre-merge hashes are embedded in 32 hand-maintained source
profiles, receipts and consumers. They are also in 866 `tools/translation/meta`
files and 808 files in each of the three `profiles/*` trees. Adding a
version-bump and unrelated-lock rule to that producer and regenerating the
meta and profile trees is the next step before bulk drafting. A `#[rustfmt::skip]`
attribute on `lib.rs` module edges is not an option because module-view spans
include outer attributes
([`mod-attribute-span.mjs`](../../../../experiments/merge-main-20261115/mod-attribute-span.mjs)).

**Status: OPEN.** Bulk drafting has not resumed. Accounting is unchanged:
12/70 DRAFTED, 58 OPEN.
