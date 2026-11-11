# Terminal beda CI failure inventory, 2026-11-11

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
[Run 42966934129](https://github.com/link-assistant/router/actions/runs/42966934129)
ran from 05:37:06 to 07:00:24 UTC against published
`beda7848b29a499f5cf3d1a7792d7353e62f12ca`. All 75 jobs are terminal:
23 failed, eight cancelled, 19 passed and 25 skipped. No Rust job was admitted.

All 30 available nonpassing job logs and the complete available workflow ZIP
are retained. Cancelled translation-13 job 130346215051 returns HTTP 404;
its log is also absent from the workflow ZIP. It remains unavailable, rather
than being inferred from another job. The snapshot's `completeCycleCollected`
flag is false for this custody gap; no job remains running.

| Job | Result | Complete log |
| --- | --- | --- |
| [reverse-bun (3)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214450) | failure | Retained |
| [reverse-bun (1)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214464) | cancelled | Retained |
| [reverse-bun (7)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214499) | cancelled | Retained |
| [translation-freshness](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214511) | failure | Retained |
| [owned-profile-matrix](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214556) | cancelled | Retained |
| [reverse-freshness](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214654) | failure | Retained |
| [typescript](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214662) | failure | Retained |
| [profile-matrix](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214686) | cancelled | Retained |
| [parity](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214698) | failure | Retained |
| [reverse-translation (7)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214868) | cancelled | Retained |
| [reverse-translation (9)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214878) | failure | Retained |
| [reverse-translation (10)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214880) | failure | Retained |
| [reverse-translation (1)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214898) | cancelled | Retained |
| [reverse-translation (12)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214921) | failure | Retained |
| [translation (15)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214923) | failure | Retained |
| [translation (2)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214924) | failure | Retained |
| [translation (11)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214965) | failure | Retained |
| [translation (8)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214974) | failure | Retained |
| [translation (5)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214978) | failure | Retained |
| [translation (1)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214986) | failure | Retained |
| [translation (3)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346214999) | failure | Retained |
| [translation (10)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215001) | failure | Retained |
| [translation (4)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215003) | failure | Retained |
| [translation (7)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215012) | failure | Retained |
| [translation (16)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215016) | cancelled | Retained |
| [translation (12)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215018) | failure | Retained |
| [translation (9)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215028) | failure | Retained |
| [translation (13)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215051) | cancelled | Unavailable: HTTP 404 |
| [translation (6)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215112) | failure | Retained |
| [translation (14)](https://github.com/link-assistant/router/actions/runs/42966934129/job/130346215114) | failure | Retained |
| [JavaScript fully green](https://github.com/link-assistant/router/actions/runs/42966934129/job/130376191838) | failure | Retained |

## Specific blocking failures

- Parity job 130346214698, log lines 896–898: actual canonical comparison
  exceeds 1200000 ms at 1200342 ms; inventory has 443 features, 441 draft
  gaps, one validation error, 865 sources and 12426 carried Rust items.
- Translation freshness job 130346214511, lines 292–300: nine genuine stale
  project, storage, JavaScript, TypeScript and parity-inventory outputs.
  The second owned-generation phase is unrun.
- TypeScript job 130346214662, line 464: ENOENT for
  `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`.
- Reverse freshness job 130346214654, line 296: current forward inventory
  differs from the owned-definition corpus. Current genuine registration
  has since been refreshed and qualified in 32 original cases; full CI remains required.
- Both profile matrices and several translation jobs reach their unchanged
  outer limits. Partial profile progress does not establish complete matrices.
- Private compiler admission still exceeds the unchanged 4194304-byte raw
  source bound by 510444 bytes. Preserved source confers no execution authority.

## Every retained original Node deadline breach

All 40 selected deadline artifacts were completely read and ZIP CRC/digest
verified. The packet retains complete JSON reports and selected stderr,
not every original ZIP or source-vector member. The separate 58856338-byte
bulk artifact 13833066411 remains uninspected. These custody limits stay explicit.
There are 35 observed Node breaches: one expected 10 ms auditor fixture and
34 genuine unchanged source deadlines. A passing assertion does not override
a failed independent audit. Bun has a separate regeneration deadline failure.

| Original case and observed failure |
| --- |
| tools/translation/test/json-source-f64-original-root.test.mjs:19:1 combined 208 and private-dispatch prerequisite execute unchanged safe_number in the complete actual root: Observed 2189618.566401ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/native-portable-corpus-concrete-syntax.test.mjs:149:1 all three real repository builds and actual JS plus strictTS consume checked semantic meta: Observed 113352.226941ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/serialization-schema/serialization-schema.test.mjs:98:1 generation compares the actual projection before offering any native replacement artifact: Observed 350929.590259ms exceeds unchanged source-declared 30000ms timeout |
| tools/translation/test/proof-byte-core-stream-candidate.test.mjs:31:1 twelve complete current native copies share the selected byte issuers and preserve full source CST inverses and Hash calls: Observed 95550.11737ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/schemars-with-output.test.mjs:70:1 complete genuine ClientKind source joins every actual sibling while preserving all value aliases: Observed 135065.599967ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/corpus-native-parse-provenance.test.mjs:164:1 all three real repository builds and actual JS plus strictTS consume checked semantic meta: Observed 87809.882134ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/option-borrowed-str-equality.test.mjs:68:1 the complete original clients parent context executes qwen_model_is_managed without a projected owner: Observed 1620242.172536ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/router-core-matches.test.mjs:33:29 native source producers retain complete historical inputs actual current outputs and every CST inverse: Observed 63226.65408ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/executable-checked-source.test.mjs:19:1 complete checked-source layer joins the unchanged lifetime birth and retains both CST phases and full inverse: Observed 70108.596187ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/private-parser-data-current-sources.test.mjs:23:1 complete three-file default proposal retains historical source inputs before and after actual installed adoption: Observed 82632.989066ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/private-parser-data-current-sources.test.mjs:27:1 both explicit candidate current wrappers follow the actual executor while retaining their exact original birth equations: Observed 71764.281889ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/static-source-lifecycle.test.mjs:37:1 actual sibling producer is deterministic and complete without changing the legacy archive: Observed 103065.174503ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/core-literal-text-adoption.test.mjs:53:1 actual complete corpus graph keeps source and owned facade routes before proposing files: Observed 67639.670115ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/router-core-json-parse.test.mjs:30:24 complete original Router callers retain their full parents and independent later refusal evidence: Observed 133753.918133ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/batched-proof-byte-source-candidate.test.mjs:16:1 every full birth source plan field equals the current plan except its explicitly additional fresh provider source inputs: Observed 111151.783839ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/batched-proof-byte-source-candidate.test.mjs:25:1 fresh repeated complete current plans retain every source fingerprint stage trace physical overlay and original refusal marker: Observed 71026.66509ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/reverse-independent-corpus.test.mjs:95:1 three complete repository builds preserve every original artifact byte and fixture message: Observed 94547.32776ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/source-method-parser-token-groups.test.mjs:187:1 complete actual original derive parents retain every source outcome and independent typed target: Observed 62523.588975ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/builtin-derive-bang-footprints.test.mjs:113:1 complete unchanged SubscriptionProvider and CatalogRecord preserve full-graph residual owners and parents: Observed 131644.699957ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/grouped-original-method-producers.test.mjs:164:1 both complete original derive parents retain the unchanged native and typed behavior: Observed 64223.386243ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/primitive-identity-boundary.test.mjs:15:1 source boundary complete HostEmitter equation follows actual native methods with complete parent and inverse: Observed 60058.588828ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/router-core-vectors.test.mjs:46:29 native source producer derives the actual owned wrapper and composes complete source inverses: Observed 70244.50267ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/internal-metadata-digest-adoption.test.mjs:33:24 complete actual provider and affinity parents retain checked methods refusals and strict behavior: Observed 77368.441136ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/derive-bang-context.test.mjs:120:1 complete unchanged original library closes CatalogRecord owners and retains unrelated root gaps: Observed 171575.530814ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/private-data-freeze.test.mjs:133:1 complete original builtin outputs private reissue failures and all cryptographic input bytes stay unchanged: Observed 69472.656532ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/native-portable-bulk-concrete-syntax.test.mjs:181:1 all three real repository builds and checked semantic targets stay inside the original workloads: Observed 126964.875982ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/original-option-regression-owners.test.mjs:40:1 unchanged actual subscription-usage parent graph restores reset-credit fallback priority: Observed 78656.142455ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/original-option-regression-owners.test.mjs:52:1 labeled original-root declaration projection verifies original recovery dependency behavior: Observed 132746.793286ms exceeds unchanged source-declared 90000ms timeout |
| tools/translation/test/source-backed-core-sequence-packets.test.mjs:22:24 source workspace lock and complete physical file census changes refuse even with old packets retained: Observed 83090.844405ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/js-to-rust/test/runtime-import-parents.test.mjs:17:24 complete original build and actual scoped public build produce identical full artifact maps without sharing a build result: Observed 78735.950772ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/test/static-source-release.test.mjs:35:1 one complete original and released producer emit identical artifacts and complete source vectors: Observed 76219.782951ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/js-to-rust/test/forward-owned-core-json-reader-definitions.test.mjs:28:24 all eight actual Rust reader definitions independently roundtrip through source CST meta and strict targets: Observed 61232.343902ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/js-to-rust/test/owned-core-base64.test.mjs:19:24 reverse original JS evaluator and strict targets consume complete shared encode and decode vectors: Observed 100360.473339ms exceeds unchanged source-declared 60000ms timeout |
| tools/translation/js-to-rust/test/owned-core-ascii.test.mjs:25:24 reverse actual runtime imports paired types and qualified Str projection preserve shared scalar cases: Observed 169327.575334ms exceeds unchanged source-declared 60000ms timeout |

## Current source and complete custody

The [166-member source/CI archive](https://github.com/link-assistant/router/blob/124edb33e096a2c018caf449214005ad555d8bdd/docs/case-studies/issue-784/evidence/struct-ordering-source-and-ci-20261111.tar.xz?raw=true)
and [receipt](evidence/struct-ordering-source-and-ci-20261111.json.gz) retain
all available failed-job streams, the complete workflow ZIP, full deadline
inspection and exact source/history inputs. All 8146186 decoded original
bytes were verified. The 6926012-byte archive has SHA-256
`24fc5b54b735119bb1916907ae20c56a1054fae1c124af882f6823778520fd52`.

The [copy-retirement receipt](evidence/struct-ci-duplicate-retirements-20261111.json.gz)
retains both complete original retirement records. After archive and process
checks, 2197908 logical and 2400256 allocated duplicate bytes were retired;
no original evidence was lost. No Rust tool or unrelated cache was touched.

The current lexical storage and genuine registration checks are separate
from this published head. Their successful focused cases do not repair the
full failure set or establish new executable-function coverage. The
[new complete local gate](current-8aa-complete-gate.md) still fails the
native regeneration deadline and is interrupted during parity. All remaining
CI, generation, parity and universal privacy criteria stay required.
