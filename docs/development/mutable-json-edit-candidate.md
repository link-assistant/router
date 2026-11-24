The unadopted JSON edit candidate targets a real common boundary: 49 historical
mutation-refusal functions in 30 whole production parents have a signature
spelled `&mut Value` or `&mut serde_json::Value`. The union of mutation first
refusals contains 201 distinct functions. These are historical, overlapping
source classifications; neither number is a newly executable count. All 49
whole function bodies still match the published source at
`c6bed6215e157de4381e39e04b4cb1ef02720384`. Canonical type and producer owners have
not been reissued by this source audit.

`tools/translation/source-profiles/mutable-json-frontier/complete49-source-DATA.json.gz`
retains all 49 full bodies with original UTF-16 and byte spans, all 30 complete
parents, the relevant complete current parser/checker/runtime sources, and the
full tracked Rust/Cargo vector at that checkpoint. Its SHA256 is
`2b685c52df36899f287ff2577dff267c0007f1b7e11d4f7f3fbda27533b07547`, compressed
size 303,136 bytes, decoded size 1,251,597 bytes. The read-only Python capture
script validates full hashes, both span equations, physical/Git blob joins and
before/after inventory/byte identity. It does not execute a compiler. Persistent
source evidence supplies no cached source, hash or verdict to translation.

The concrete next layer is `json-edit-candidate-runtime.mjs` paired with the new
unregistered Rust `translation_core/json_edit_candidate.rs`. JS slots own bounded
canonical frozen JSON, with separately copied snapshots. A synchronous callback
receives a privately issued exclusive loan. A child reborrow suspends its parent;
closed, copied and foreign loan handles refuse. Edits commit immediately. Early
return and Err preserve completed edits; a thrown value propagates unchanged
while `finally` revokes the loan. Scope exit never rolls edits back. Promise,
thenable and proxy results refuse without reading caller getters, after retaining
any already completed edits. The JS runtime is an application storage ABI, not a
Rust parser/checker loan issuer.

Rust uses actual `&mut Value` and lexical reborrows, with untranslated serde_json
internals. The original reference qualifiers remain present. The successful
resource domain is the existing canonical JSON domain: 4096 nodes, depth 32,
dense arrays and valid Unicode strings, with existing numeric and UTF-8 key
ordering constraints. Allocation/OOM/allocator observations and arbitrary payload
Drop remain outside that domain. The candidate changes no current frozen JSON
layout, Host registry, facade source or default translation path.

`proposeJsonEditRemoveLeaf` implements a two-phase CST proposal for the complete
actual `rust/src/thinking/apply.rs` parent. Source-issued module items select the
exact retained `remove` function and its closed if-let/object-remove expression.
The language sequence preserves `fn remove(body: &mut Value, field: &str)` and
selects an explicit edit operation. The repository sequence qualifies that call
as `crate::translation_core::json_edit_candidate::remove_if_object(body, field)`.
Both complete source stages, serialized/reparsed CSTs and exact inverses are
retained. All bytes outside that expression remain unchanged. Changed parents,
attributes, operations or source paths refuse instead of inheriting the old
selection. No physical source is installed.

`prepareJsonEditRemoveLeafCandidate({root})` also freshly reads the captured
historical Rust/Cargo inputs, recenses all current tracked/untracked Rust/Cargo
paths, retains their current hashes plus the complete paired candidate sources,
and rejoins every byte before returning. New native owner and semantic checks
are still mandatory. This proposal deliberately reports `facadeInstalled:false`
and `executableAdmission:false`; a source hash, lexical `Value` spelling or
copied CST does not resolve `Some`, `as_object_mut` or `remove`.

The remaining integration is concrete:

1. Add an actual source-derived facade edge and privately join the full Rust leaf,
   JS runtime and declaration ABI. Keep existing historical facade equations.
2. Extend the real parser before its current mutable-reference refusal. Issue a
   private exact-node/source association for the canonical serde_json Value root;
   reissue it after actual normalization and each fresh checker invocation.
3. Extend owned-JSON flow with an exclusive root state and child-path loans.
   Reject shared aliases during a write, overlapping mutable reborrows, closure
   capture, escaping loans, unknown effects/Drop and mutation across await.
4. Lower complete call sites as well as callees. Existing JS Value objects are
   frozen; the original `&mut Value` ABI cannot be mapped to a Value object or
   treated as the existing direct-local `routerSet` operation. A genuine private
   slot/writeback boundary must preserve changes on return, Err and throw, and
   argument/RHS evaluation order. The runtime slot brand does not prove this join.
5. Recheck original enclosing cfg, attributes/macros, imports and canonical owners
   under the actual explicitly supplied compilation profile. Preserve unknown
   alternatives and original source. Run fresh whole-function/project JS and
   strict TS checks, then the CI-only Rust oracle after the JS gate.

The immediate complete leaf is `thinking::apply::remove` (original index 2294).
Follow-up full bodies already retained for the same shared foundation are:

| Original index | Full function | Additional edit/control obligation |
| --- | --- | --- |
| 264 | `bridge_request::copy_responses_cache_control` | Conditional write, owned JSON macro RHS, canonical shared input |
| 1977 | `responses_chat_input::copy_prompt_cache_breakpoint` | Shared source loan, owned clone before target write |
| 2153 | `structured_output::install_format` | Owned Option transfer, nested null/object writes |
| 2154 | `structured_output::install_parallel_tool_policy` | Early return, Option<bool>, nested object writes |
| 123 | `anthropic_nonstream::merge_object` | Two optional object loans, cloned entries, ordered extend |

Those five are not yet admitted and may expose further refusals. Four of the 49
are async; one returns a mutable Map reference (`subscription::external::metadata_mut`).
They remain outside the initial synchronous nonescaping contract. Other bodies
need mutable array retain/iteration, pointer paths, user enums, external helpers
or HTTP/application-state effects. No counts from these overlapping patterns are
added together or called coverage.

The seven-case JS receiving file covers whole source custody/CST inverses,
changed-source refusals, scalar/nonobject/missing/Unicode keys, immediate partial
writes on early return/Err/throw, reborrow suspension and alias refusal, dead and
foreign handles, asynchronous/getter/proxy boundaries and canonical resource
limits. The separate Rust oracle source checks corresponding native no-op,
remove, Err/unwind and reborrow behavior. Generation, JavaScript/Bun tests, strict
TypeScript and Rust execution are all unrun for this draft. The only executed
check is bounded Python source DATA capture/readback and static diff review.
