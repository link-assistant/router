# Native tagged constructor draft

All implementation and regression source in this batch are drafted and unrun.
No tests, experiments, diagnostics, translation, source preparation, regeneration,
Rust tools, push or CI ran. All unfinished [ledger requirements](bulk-draft-requirements.md)
remain open. There is no new coverage or parity result.

The complete resource flow now drafts exact Some/None object-literal syntax and
contextual String-error Ok/Err construction. It accepts ordinary static data
fields in the original tag/payload order. Getters, computed fields, spreads,
extra fields, missing payloads and unknown tags refuse. TypeScript const
assertions are allowed only on the actual fixed literal tag. JS-to-TS output
retains that literal tag, and TS-to-JS erasure removes its actual assertion span.

Some payloads pass through the existing expression, ownership and root checker.
The resulting complete Option domain must match any actual written or operation
context. None requires a real complete Option context; it cannot choose a payload
type from a public marker. Result construction requires an actual String-error
Result context, with independently checked success or owned error payload.
Unproved resource-disposal and other error-family cases remain refused. Returned
borrow roots and the existing complete cleanup checks still apply.

Function, callback, branch, local, assertion and operation-argument contexts use
actual source annotations and checked operation signatures. These constraints
are retained in target JSDoc rather than accepting a shape or domain label as
permission. The native projector emits ordinary tagged source proposals; fresh
whole JS/meta checking must reproduce the original native constructors. Existing
same-guarded-value reconstruction remains available. Some can compute a new
payload rather than only restoring the original guarded container.

The generic Option signature reader and physical signature formatter now draft
nested supported owned payloads through the same actual identity ABI. There is
no additional runtime library. Native positive numeric Option local proposals
retain their complete signed/unsigned type docs rather than losing the inner
domain. Every original current-source and library proof remains required.

Seven complete source equations retain native owners, both ordered substitution
phases and complete CST inverses. Independent JS/strict TS/native source covers
Boolean changes, absence, Unicode owned strings, nested Options, owned lists,
numeric boundaries, Result branches, malformed source, changed inputs and forged
meta. Resource oracle module 38 is drafted. These cases have not run. Original
noncanonical expression grouping is drafted in the separate
[grouping successor](http-resource-native-groups-draft.md), including the raw
if-let case and its complete original equation. That source is also unrun.

Wider Result inference and resource error construction, architecture and producer
closure, general effects and types, production adoption/parity, original history
and performance bounds, export receiving, reverse freshness and every CI gate
remain unfinished.
