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
