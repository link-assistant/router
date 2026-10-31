# Outcome-sensitive local HTTP helper specialization: source draft

All new compiler/parser/translator/preparer/interpreter/test/native execution is
**UNRUN**. No CI or review feedback was inspected. No whole production coverage,
verified equivalence, receiving qualification or broad checklist closure is claimed.

The existing HTTP checker already accepts checked synchronous and cold local
helpers. Its concrete remaining refusal is a helper that releases a mutable
resource input on only some exits: the original local contract records
`partial helper input release requires an outcome-sensitive source state join`.
`tools/translation/http-helper-bulk-20261101.mjs` drafts actual source lowering
for an explicit common subset of this blocker. A synchronous leaf helper returns
literal Boolean outcomes; its caller uses the helper as a complete terminal
`if` condition with both original return continuations. For example:

```javascript
function releaseIf(client, token, immediate) {
  if (immediate) { signal(token); dispose(client); return true; }
  return false;
}
// Inside the original checked cold caller:
if (releaseIf(client, token, immediate)) {
  return isSet(token);
} else {
  dispose(client); return isSet(token);
}
```

The source expansion copies the complete selected helper body and replaces each
literal return with the corresponding original complete caller continuation.
Helper parameters are substituted from distinct actual caller input identifiers
or closed Boolean/text literals. Argument expressions are effect-free lexical
reads/literals, so once-only original argument evaluation introduces no new
observable evaluation. Repeated argument identifiers, effectful/property/local
arguments, helper-local declarations/mutation, unknown captures, helper cycles,
nonterminal caller continuations and unsupported helper references refuse.
Selected helpers call only original imported operations; the original checker
must qualify each actual operation and every operand/effect.

Every original selected helper body is checked unchanged in an explicitly
retained helper-only source proposal with all original imports. Full original
source/CST and the whole helper-only inverse remain retained; removal of caller
declarations does not grant source authority. The original whole expanded module
is then checked afresh, including the unchanged helper declarations. Actual
original helper and caller parameter types are reissued through checked semantic
meta and compared for every original argument, including unused helper inputs.
A requested helper name or decoded metadata alone never supplies a domain.

The existing private whole-body checker now sees each concrete branch's actual
release state. It retains its original resource/loan/move/type/error/cancellation
checks; no partial-release refusal or helper contract was relaxed. Both language
phases remain explicit: `language`, then `repository`. Full original source and
all proposals cross serialized/reparsed CST and retain complete source inverses.
Both emitted JS/TS bodies are independently checked; the complete canonical Rust
enters the original native inverse and must reproduce whole Rust syntax.

Only synchronous helper execution is specialized. The caller's existing cold
wrapper remains at its exact original location. Async/cold helper inlining is
refused: erasing an await/thenable boundary could change observable scheduling.
Existing supported cold helpers are unchanged. Arbitrary helper graphs, recursive
or callback producers, generic alias/lifetime synthesis and outcome-dependent
non-Boolean error mapping remain separate source work.

All complete returned DATA, including duplicated helper/checker/meta/paired/
reverse/CST/equation/trace/source records, receives the existing complete
occurrence accounting: separate 16 MiB UTF16/UTF8 bounds, 2,000,000 cells and depth
160. Source expansion is bounded before allocating expanded strings. No cache
crosses operations. Full original HTTP inputs close on success and failure through
the existing shared source-failure/closing protocol, preserving the primary
thrown value and invalidating enclosing original source scopes after observed
private source failures.

The independent case source includes the actual old partial-release refusal,
original-forwarded JS behavior, canonical JS and strict lockfile TypeScript5.9.3,
native inverse outputs, both cleanup outcomes, cold cancellation ordering,
wrong/unused-argument domains, aliases, captures, cycles, async helpers and stale
native/runtime/declaration source. The additive complete harness preserves the
full strict command, compiler version/diagnostics, process deadline and cleanup.
The independent CI-only native oracle expresses the matching branch-sensitive
behavior using the real control/HTTP facades. All remain UNRUN.

## Integration and limits

The addon is an explicit source-proposal API. It does not modify shared dispatch,
original helper contracts, source profiles, native/JS/TS ABIs, CI commands or
production bodies. Original application source equivalence remains unqualified;
`originalBodyEquivalenceQualified` is false. Review the closed transformation and
receive the whole source cases before installing/adopting proposals. Original
Rust source with a partial-release helper call remains outside the old inverse's
admission domain; only the complete checked canonical expanded Rust is reissued.
Recovering the original helper-call layout requires its retained full inverse.

Production caller selection, physical application ownership, full Cargo/
dependency/configuration closure, generalized resource-sensitive helper summaries,
async inlining with explicit scheduling, broader streaming/error/result behavior,
whole-corpus synchronization, application coverage and full same-SHA JavaScript
then Rust CI remain OPEN. This provides additional source receipts toward
B04/F03/V03/T04, not broad completion. Coordinator integration should retain the
actual old source-domain refusal and add the complete new focused case file to
its existing reviewed command partition without weakening gates or deadlines.
