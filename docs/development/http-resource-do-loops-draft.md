# Original post-test resource loop draft

Actual JS/TS `do…while` blocks now share the original full loop state, condition,
function-return, root and resource-exit checks. Complete source/meta checking
still runs; an unsupported label, missing block or incompatible state refuses.

Native emission uses canonical `loop` with a condition gate after normal
body fallthrough. Every nearest-loop continue gets its own gate first. Break
and return skip the condition, and nested loops reset the continue context.
Unconditional terminal bodies receive no unreachable trailing gate. Native
syntax/projection rules read this ordinary loop/if form as a JavaScript `for(;;)`
and the complete
new JavaScript source must reproduce all native tokens before acceptance.

Full original checker/emitter sources, the added fallthrough DATA helper, both
ordered substitution sequences and complete CST inverses are retained. The
semantic end-of-module addition uses original source coordinates in the language
sequence. Independent unrun JS/strict TS/native source covers execute-once,
conditional continues, nested control, branches, returns, source refusals and
forged meta. Empty-header infinite loops receive the same full state checks;
the prior literal-true while source contract remains distinct. The eleventh
native oracle joins existing gated CI discovery.
No test, translator, preparer, diagnostic, runtime or Rust tool ran for this
draft. General numeric/iterator loops, wider language domains, namespace and
producer closure, production parity and every unfinished requirement stay open.
