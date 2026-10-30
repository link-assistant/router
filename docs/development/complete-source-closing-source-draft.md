# Complete source-operation closing protocol

All implementation and independent cases remain UNRUN source drafts. Full
requirements and every translation/qualification obligation stay OPEN.

The generic `withCompleteSourceClosingFence` copies the actual standard-input
reader's all-checks/primary-error protocol into a reusable module. It snapshots
a bounded dense array of ordinary closing callbacks without invoking accessors,
executes every check in order even after failures, and clears its temporary
callback list. If work succeeded, the first closing failure is thrown. If work
threw, that exact value wins, including null, undefined or a symbol. No source,
hash, owner, verdict or result cache crosses operations.

The impl and ancestor namespace readers now use one closing callback per actual
selected input plus their original host guard. They no longer stop subsequent
archive checks when a manifest closing check fails, and a closing failure no
longer masks an original callback throw. The ancestor reader always clears its
private input list. The standard-Copy reader uses the same protocol for all seven
inputs, host checks and private source scratch cleanup. Its full entry/read/CST
and existing synchronous result checks remain intact. Earlier namespace entry
source reconstruction remains before the callback scope, with all original
pins, decoded limits, selections and refusal checks unchanged.

Async/proxy callbacks are refused before invocation. Promise/proxy results and
then fields are refused without reading a then getter. These synchronous checks
and closing callbacks issue no source, type, namespace or runtime authority;
the private caller still reconstructs and validates its actual source inputs.
DATA fixture directories do not become private issuer options. Original source
plan APIs and the two rule-phase names remain unchanged.

Five complete source equations retain whole frozen originals, lossless CST/meta
transport, exact inverses and language then repository sequences. Independent
unrun cases cover all-check order, multiple/falsy closing failures, exact primary
throw preservation, invalid results, getter/proxy/async refusals, actual single
and multi-reader closing failures, restoration and fresh subsequent calls.
Fixture mutation remains in task-owned temporary copies, never checked-in inputs.
No parser, preparer, translator, compiler or test was run; CI is uninspected.

Current compiler/export receiving, profile/runtime compatibility, performance,
canonical and reverse freshness, native owner closure, parity and the complete
requirement draft remain OPEN. Fatal Rust CI still requires every same-SHA
JavaScript stage first; no Rust tool is authorized locally.
