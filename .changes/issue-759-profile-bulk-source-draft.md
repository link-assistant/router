Draft a reusable full-corpus translator for explicitly selected compilation
profiles. A privately captured, bounded corpus retains complete original Rust
and Cargo bytes, including sparse tracked inputs. Every profile builds its own
module, namespace, type and effect contexts and emits meta-language, JavaScript,
TypeScript, runtime assets and an inventory under its exact profile digest.
Prepare every output plan and validate isolated paths before writing any
profile; ordinary neutral outputs remain separate. Drift checks preserve all
missing, stale and unexpected paths. Source sets, matrix membership, required
profiles and translator implementation hashes remain in the inventories.
No profile-independent executable, complete platform domain or native parity
is claimed. The reusable translator CLI supports an explicit --profile-matrix
write or drift-check cycle. Ten newly authored source-corpus and bulk-profile
tests pass under Node and Bun. The complete initial 25-file regression scope
has 240 passing and three failing cases under each engine. The failures retain
the sparse generated-artifact prerequisite, a historical inline-function
expectation, and dependent host support referencing a shadowed namespace.
The latter two now have source repairs awaiting coherent rerun; no corpus
producer, full gate or local Rust build ran in this focused window.
Sealed plans deeply freeze their inventories, and supplied corpus selections
are validated as ordinary path data without invoking getters or proxy traps.
Qualified namespace setup computes ancestor macro and prelude evidence once
for the consuming scope; other owners contribute the same namespace maps and
visibility checks. This source-only refactor has no measured performance claim
and passes the initial module and namespace regression cases.
When a source module excludes a registered host namespace, its dependent
support types are excluded transitively; actual source refusals keep their
own location. Checked inline source functions called Some execute their
original body and preserve integer overflow checks.
The first repaired 25-file run has 244 passing and one failing case under both
engines. Its new source-location assertion exposes declaration-local parser
coordinates; those now relocate once into the complete original file's UTF-16
coordinates, including inline and external modules. The following run has
245 passing and one failing case per engine: its newly authored nested-std
negative assumption is invalid because the checked custom type is distinct
from the standard owner. A typed positive now checks that custom layout,
while an explicitly unsupported unsafe expression checks exact original
inline/external parser coordinates. The complete scope awaits rerun.
