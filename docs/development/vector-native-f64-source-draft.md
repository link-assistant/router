# Native binary64 vector source synchronization draft

SOURCE ONLY; all implementation and cases remain UNRUN. No parser, translator,
preparer, planner/installer, tests, experiments or compiler ran. CI feedback is
uninspected and every delivery requirement remains OPEN.

The same native vector source projection now drafts actual source-qualified f64
parameters and Vec<f64> elements, alongside existing bool/integer domains. The
existing observedSourceF64 check supplies the exact written native type domain
only when reached through the fresh original source traversal. Erased float,
f32, borrowed/mutable and unresolved domains stay refused.

Expected and actual finite literal strings reuse the existing canonical f64
literal decoder and original-intrinsic guards. Negative zero remains the string
-0 in the source projection; finite minima/subnormals/maxima are not coerced to
integer domains or JSON numbers. Actual parsed Rust decimal literals still use
the exact existing single-rounding decoder before their checkedSource value is
compared. Dynamic f64 parameters retain Number NaN/infinity classifications;
NaN payload/sign observability remains outside the existing profile.

The shared change covers JS/TS-authoritative reinput, complete bool branch trees,
original-header native source substitutions, whole-project forward checking,
exact condition/leaf reproduction and the already drafted physical source unit
transaction. No second native emitter, translator or installer was introduced.
Two complete source equations retain language then repository rules, source/CST
inverses, both preparation roots and all previous exact census checks.

Independent unrun source covers signed-zero distinction, subnormal/max literals,
all nonfinite input classes, empty/selected branches, changed zero fingerprints,
erased/f32 input refusals and JavaScript-authority edits. Independent Rust oracle
source remains CI-only after all eight same-SHA JS gates. This batch is not
coverage, runtime parity or receiving qualification evidence. Text/JSON native
synchronization, general collection mutation, complete caller/namespace coverage
and every remaining transaction/platform/performance/CI obligation stay OPEN.
