# Shared reverse JSON result type source draft

All new implementation and independent regression sources are UNRUN. Source
construction and review executed no emitter, native TypeScript compiler, runtime,
preparer, tests, experiments, generation, Rust tool or CI-triggering push.

A shared data-only helper derives an optional JSON declaration witness from the
same finite reader catalogue used by actual call checking. It returns no witness
for plain scalar, owned carrier or unsupported types, and rejects non-string
requests without coercion. The helper cannot issue a source context or checked
caller.

Seven actual emitters now use the runtime declaration's ReturnType for these
results: core, collections, iteration, vector candidate, state, outcome and
cancellation. Existing specialized carrier witnesses retain their precedence.
This keeps scalar and borrowed aggregate results tied to the checked runtime's
actual declarations and makes future catalogue extensions available across
these emitters without another copied JSON optional-type list. Input domains,
public optional boundaries, native source/Cargo, symbol, ownership, root,
whole-function and current-context checks remain independent and unchanged.

Nine complete compiler equations retain original modules and native function/
import owners, separately ordered language/repository substitutions,
serialized/reparsed CST/meta and complete physical inverses. Independent unrun
cases require all seven genuine receiving contexts to emit the five new reader
domains, strict-compile complete outputs with the repository compiler and record
its version, then execute emitted borrowed-array and wrong-kind cases. The
cancellation context retains its complete real native/runtime/declaration
boundary. Original per-case/child deadlines and all gates remain in force.

No original equivalence, native authority, receiving, timing, source-bank/export
freshness, full production/reverse synchronization or parity qualification is
claimed. Every remaining source and verification requirement stays open.
