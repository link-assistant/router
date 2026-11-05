# Scalar optional conditional source draft

SOURCE ONLY. All implementation, receiving cases and equations are UNRUN.
CI remains uninspected. Full source drafting, coverage and parity remain OPEN.

Borrowed str and bool/u64/i64 payloads can feed pure scalar conditional
expressions. Native emission uses an actual Some binder scoped to its arm,
restores the parent mapping on every exit and never emits unchecked extraction.
The fresh native ordered comparison grants Some facts only to the corresponding
branch, restores facts after each nested expression and refuses arm effects.
Equivalent None guards swap arms only in the inert comparison representation.

Unsigned literals beside an actual u64/i64 branch are narrowed by the existing
checked literal rules after private source type resolution, including signed
bounds. This is scoped to the JSON-vector non-primitive profile. No caller flag,
source-history layout or saved fact grants ownership/type/namespace permission.

Four complete source equations retain originals, full CST inverses and language
then repository phases. Four-domain/three-guard batches draft both script
authorities, present/missing values, Unicode, max-u64/min-i64, signed zero fallback,
invalid arm access, escaping payloads and oversized signed fallbacks. JSON and
other effectful conditional payloads, opaque/owned Options and all broader
namespace/ownership/synchronization/receiving/platform/performance/CI work remain
OPEN. Eight same-SHA JavaScript stages still precede fatal CI-only Rust. No local
test or compilation was executed.
