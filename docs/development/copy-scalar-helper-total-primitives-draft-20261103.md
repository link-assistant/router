# Total primitive operations inside scalar helpers

This source draft extends the [adopted argument family](scalar-helper-arguments-adoption-20261103.md)
with a shared operation family rather than individual caller rewrites. The two
reader successors remain proposals, not installed. All execution is UNRUN,
CI NOT_INSPECTED, acceptance counting12/70 DRAFTED,58 OPEN and production
coverage UNKNOWN. The installed source graph remains424 equations/272 paths.

The new normalizer handles original checked scalar IR for eager Boolean/fixed
bitwise operations, fixed complement, all fixed-domain casts, wrapping and
saturating add/subtract/multiply, and min/max. It reuses the original carrier
metadata validator and target emitter/interpreter. Their existing native checks,
actual dependencies, strict types and runtime contracts stay mandatory. The new
normalizer is pure DATA and cannot issue source/type/body/ownership authority.

The original argument substitution remains the direct path when neither helper
nor arguments contains this new family. For new expressions, every eager
argument and every local initializer is checked, including unused locals and
unselected branches. Conditional/helper branches have separate environments.
Resolved caller terms are cloned without looking up their names as helper
locals. Duplicate/shadowed locals, captures, forward references, assignment,
loops and incomplete returns remain explicit refusals. Validation and expansion
share100000cells/depth160 and charge the original caller budget. No new persistent
source, owner, result or verdict cache exists.

Only operations total over their genuinely checked primitive domains may be
moved, duplicated or eliminated this way. Checked arithmetic, division/remainder,
shifts, clamp and arbitrary calls remain refused: their failures need ordered
statement substitutions. This does not waive their translation requirement.
Native direct-operator witnesses need their separate original provenance join;
the new helper lane qualifies canonical runtime calls with actual import
receipts, not arbitrary same-shaped operator IR.

Both full reader proposals allow only actual named canonical primitive value
imports or existing canonical scalar type imports inside helper modules. They
use the original private native Program and original import checker for every
specifier, including type-only mixed imports. Module effects, default/namespace
imports, attributes and unsupported bindings remain refused. The whole helper
still passes its original body checker. Its total-operation receipt census must
match the operations actually visited, including unused initializers. Runtime
receipts are lifted only after successful substitution, retaining their original
helper path/span and complete source-linked import ancestry. Minimal helper
receipt locators retain the declaration association; fresh whole-source/meta
reissuance independently reconstructs the entire result.

The new separate Rust inverse copies the complete scalar inverse and replaces
its no-host-call restriction only for freshly checked total scalar programs.
The same normalizer requalifies all runtime-bearing bodies before restoration
or reprojection. Whole canonical Rust reproduction, original parser/CST, native
library protection, paired source conflicts and unchanged helper-network
restoration stay mandatory. The existing scalar inverse API remains unchanged.
Edited Rust helper decomposition still requires reconciliation and is not
silently resolved by a canonical projection.

A new fourteen-input fixed archive retains the previous eight sources and the
new normalizer/inverse plus the complete original metadata validator, method,
arithmetic and abort-message dependencies. Both reader proposals require their
complete current bytes at entry/exit inside the original Boolean fence. Old
archives and afterimages remain immutable. Two counted language/repository
sequences retain full before/after/intermediate CST serialization, reparse and
exact inverse source. No draft source is imported to author these packets.

Independent pure case source covers byte-domain wrapping/saturation, eager
Boolean truth tables, caller/helper-name isolation, casts/complement metadata,
complete receipt counts, unused failing operations and exact primary budgets.
Receiving source drafts both actual readers,80 method callers and100 cross-domain
cast/complement callers per lane, extrema/interpreter/meta checks, unchanged
Rust restoration and refusal cases. Native Rust oracle source independently
asserts all ten widths' extrema, casts and Boolean truth tables. Rust is CI-only
after every same-SHA JavaScript gate; no new cases have run.

Complete two-reader/four-creation packet
SHA0429f315caed59bcecc889ad936dfe5dcb1140787c4716a0e1521522b0f06ef9,
186414 compressed bytes. Fourteen-input archive
SHA cf3e8f1c5d397c12c6af5af2210fc70e7034a1886414860407c43b94f4421231.
Next append the complete source-history adoption and cases, preserving all424
existing equations, before qualification. Remaining general statement/effect,
helper-network, TypeScript, application and other open clauses still require
actual implementation and independent case source.
