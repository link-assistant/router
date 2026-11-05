# Option predicate source composition draft

All implementation and independent case SOURCE remains UNRUN. No tests,
compilation, translator/preparer/runtime execution, experiments or CI feedback
inspection occurred. Full translation and verification remain unfinished.

The callback selector now substitutes original is_some_and and is_none_or calls
through existing input-to-bool Option map and bool fallback interfaces. None
uses false or true respectively; Some invokes the original predicate once,
including false/zero/empty payloads. No runtime ABI is added. Actual original
receiver, closure construction/captures, source body and evaluation order remain
intact. All five existing callback input domains retain their current contracts.

A shared bounded source rule recognizes only bool and text equality/inequality,
composing current lexical/core roles and original literals without evaluation.
It grants no PartialEq dispatch or native type permission. Text ordering, mixed
bool/text domains, unknown operands and chained relations remain refused. The
existing boolean sequence composes equality with native comparisons/logical
source. Actual complete type/owner/capture/ownership/body checks remain
independent; every source/semantic/executable authority flag remains false.

Predicate lexical regions join the same bounded callback scope census. Existing
128-token call,256-token boolean/equality expression,64-delimiter,8 local group
and whole function budgets remain. Unsupported payloads, function references,
nonboolean predicates and wider control remain original and cannot establish
admission. No source or verdict cache is introduced.

Five complete compiler equations retain immutable originals, native-selected
owners, separate language/repository rules and full serialized/reparsed CST
inverses. Independent unrun source covers equality/domain/token/refusal cases,
six adopter APIs, twelve actual callers including nested Result predicates,
false/zero/absence/error/Unicode/limit behavior, JS/strict TypeScript, invalid
body nonadmission, paired reverse receiving/native Rust inverse, native standard
predicate/callback-order oracles and export closure. Function-reference and JSON/
struct predicates and every unfinished namespace/production/reverse/sync/
freshness/parity/delivery obligation remain OPEN. No coverage gain or verified
completion is claimed. Static method occurrences are a worklist, not coverage.
