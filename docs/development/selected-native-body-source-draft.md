# Complete-program native body selection draft

SOURCE ONLY. All new implementation, regression and receiving cases are UNRUN.
CI feedback remains uninspected. Full drafting, runtime parity, actual coverage,
freshness and resource qualification remain OPEN.

Source review found that per-function native JSON body emission passed only the
selected function to the program checker. A helper caller needs its complete
checked callee closure. Passing every function directly to native JSON emission
would also incorrectly require unrelated primitive vectors to use that mode.

The emitter now drafts an explicit selected-function option for native Rust mode.
It privately rechecks the complete input program and callee closure first. Every
function must share the genuine receiving context, including functions that are
not selected. Only then can it select one actual function for native body output.
The existing native JSON constraints still apply to that selected function; normal
whole-program emission retains its existing requirements.

The body helper independently rejoins its requested item with the complete genuine
program and context, and the native synchronizer supplies that full program.
Missing helpers, forged/unissued items, wrong modes, absent selections and hidden
mixed contexts refuse. The copied discovery observer's body helper has the same
source update. No fragment, function name or public metadata issues admission.

Five complete source equations retain originals and exactly language then
repository phases. Independent drafts cover a scalar helper/caller plus an
unrelated primitive-vector function, whole native synchronization, fragment and
mode refusals and unselected cross-context functions. All are unrun. Broader
operators/ABI/ownership/effects, route additions/removals and full receiving/
performance/platform/CI requirements remain OPEN. Eight same-SHA JavaScript gates
still precede fatal CI-only Rust. No local parser, translator, test or compilation
ran.
