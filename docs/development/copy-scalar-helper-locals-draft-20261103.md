# Pure scalar helper locals

This drafts the next common limitation in the
[adopted scalar helper family](copy-scalar-helper-adoption-20261103.md): ordered
scalar locals before a return or complete `if/else` return tree. The two original
reader changes are an **uninstalled source proposal**; their installed code and
six-input source archive remain intact. All execution and CI feedback inspection
remain UNRUN. Counts stay12/70 DRAFTED,58 OPEN; coverage remains UNKNOWN.

The [new substitution](../../tools/translation/copy-scalar-helper-local-substitution-20261103.mjs)
normalizes only actual checked Boolean/fixed-integer helper IR. Every helper
still requires its original private declaration/import/type/body proof. All host
and source calls remain refused. Ordered initializer expressions may use only
previously bound parameters/locals. Separate branch environments prevent locals
from leaking across arms, and duplicate/shadowed bindings or forward references
are refused. Assignment, partial returns, loops, arithmetic/bitwise operations,
ownership carriers and captures require separate rules.

Even unused initializers are visited, typed, range-checked and checked for effects
or unsupported operations before they can disappear. The language sequence
resolves locals to expressions containing original helper parameter names only,
then delegates operand substitution to the complete existing scalar rule.
Already resolved expressions are cloned without resolving their parameter names
again as locals. Caller names matching a helper local therefore cannot capture
the substitution. The repository sequence preserves the existing expression IR
and caller-binding convention.

Helpers with no local declarations delegate directly to the original rule with
the same callback and return-tree work sequence. For new local helpers, both
normalization and final expansion share the original100000-cell/depth160 bound
and charge the actual caller's existing budget. There is no operation-spanning
source, owner, checked-body, verdict or result cache.

The [source proposal](../../tools/translation/copy-scalar-helper-locals-20261103-profile.mjs)
retains complete before/after images of both original readers. Its repository
sequence binds the new normalizer under the existing substitution import name;
the old implementation remains unchanged. Its language sequence adds the new
normalizer to the complete fixed source restriction using a separate seven-input
archive. The original four-input Boolean restriction remains nested, and the old
six-input Copy archive and every historical afterimage stay immutable. Whole
intermediate source/CST serialization, reparse and exact inverses remain required.
The installed source index is still401/270 until the subsequent adoption.

The [pure case source](../../tools/translation/test/copy-scalar-helper-local-substitution-20261103.test.mjs)
drafts all ten integer extrema, branch-local names, caller/local name collisions,
unchanged no-local charges, even unused unsupported initializers, captures,
assignments, forward references, exact budget primaries and depth failures.
The [native receiving image](../../tools/translation/source-profiles/copy-scalar-helper-locals-20261103/receiving-source.mjs.txt)
drafts both real readers, all eleven Copy roles, original helper source, actual
interpreters, independent meta reissuance and source-level refusal cases.
These are source cases, not observed passes.

Packet SHA46aef360dae27dd89b22d0aca9744b6a9c222baa8e2bddf395fdcf94e749f7f8,
180434 compressed bytes; seven-input archive
SHAa5b2d132bf5710e646dc4b32b7123229c2a000e1727484b1410fc9d6eb2d02da.
Install the two exact reader successors and native case through the genuine
source-history continuation before qualification. Complete general helper edit
reconciliation, remaining type/effect/ownership/module families, application
adoption and the other open bundles before verification. This draft does not
claim generic locals, mutable state, full receiving or whole-source translation.
