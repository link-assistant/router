# Native scalar early-return control flow

This source draft extends the [adopted helper graph lane](ordered-helper-graph-adoption-20261104.md)
with ordinary early returns, missing else arms, nonterminating branch bodies,
unbraced branches and else-if chains. Both complete original reader successors
are now [source adopted](scalar-early-return-adoption-20261104.md). All execution is UNRUN, CI NOT_INSPECTED,
counts12/70 DRAFTED,58 OPEN and actual production coverage UNKNOWN. The installed
source-history graph now retains482/276.

## Preserve original native lexical/type proof

The reader proposals parse the original actual native branch nodes in the
private ordered mode. Each condition and statement passes the same original
expression, binding, native symbol/type and body checks. They use original
branch scopes and refinement, retain original source spans and paired-type
associations, and record a complete return only when both branch arms return.
The final original function must still return on every path. Other source modes
keep their old control-flow branches and failure ordering.

There is no pre-check source hoisting or text rewrite. An early reference to a
later declaration must still fail its actual original lexical/symbol check;
rewriting that declaration into an else arm could incorrectly expose an imported
binding. The new path instead keeps that original native proof and lowers its
already checked scalar IR. Root/parameter/result constraints remain Boolean or
actual fixed native scalars; wider ownership/effect domains need separate rules.

## Ordered continuation substitution

The new normalizer is a complete separate copy of the existing ordered rule.
The old module stays unchanged. A body with no early/fallthrough control flow
delegates directly to the old rule, retaining its result and exact caller-budget
callback sequence. The new family checks complete structural return flow for
caller/helper bodies, refuses statements after a terminating tree and requires
all function paths to return. This structural metadata grants no native body,
source, type, binding or ownership permission.

An early helper return resumes the caller continuation immediately. A branch
which falls through resumes the remainder of its enclosing block in a fresh
copy of the enclosing scope; branch-local declarations never enter that scope.
An empty/missing else falls through the same way. The continuation does not
re-evaluate eager arguments, execute a skipped helper tail, or move later failing
initializers onto an early-return path. Trailing control flow may be duplicated
only into mutually exclusive branches. The existing immutable let/if/return IR
is retained; no partial-branch opcode is serialized or admitted by flag.

The copied rule retains eager operation metadata checks, fresh names, lazy
expression branches, linked continuation plans, immutable operand spines and
iterative output materialization. All planning/flow/expansion work shares the
original100000-cell/depth160 limits. Expanded output beyond those limits refuses
instead of being truncated or raising a cap. Maps/Sets contain invocation-local
syntax metadata only; no source/owner/body-verdict/result cache spans operations.

Only genuine helper calls or native-observed fallthrough select normalization.
Already lowered complete canonical projection bodies keep their original path,
so inverse requalification does not repeatedly rename/wrap generated locals.
Existing source-document/meta reissuance, original target emitters/interpreters,
Rust inverse and source reconciliation remain the actual entry machinery. The
new eight-input ordered archive retains the old seven sources and adds the
complete new normalizer, nested inside unchanged Copy/Boolean guards. All older
archives and afterimages remain immutable.

## Independent source cases and outstanding scope

Copied independent JS case source retains the original ordering/failure/lazy/
hygiene/recursion/resource/primary checks. New unrun cases assert early helper
returns followed by caller work, skipped division tails, later failures, branch
local isolation, late lexical capture refusal, mismatched returns, missing paths,
unreachable statements and exact old-path callback work. Native Rust oracle
source independently asserts early-return/failure/caller and else-if results;
Rust remains CI-only after all same-SHA JavaScript stages.

Native receiving source drafts both original readers, paired/unpaired TypeScript,
unbraced helper returns and unused native division, unchanged Rust restoration,
fallthrough locals, else-if extrema and original missing-return/unreachable/
late-binding/type refusals. All these are unexecuted case sources. Proposed
readers remain932/866lines, below the1000-line policy.

Complete two-reader/one-copy/two-creation packet
SHA03b21f5032afa488df4992a1b43443d28162f37556e9a840c711376a4f8b6a0a,
195722compressed bytes. Eight-input archive
SHA13f81110bb0782ad05c47126c1bd478f68a7a33816f34442ee2cd5b21083abbe.
Whole original/copy/final source images retain separate language/repository
substitutions, full intermediate CST serialization/reparse and exact inverses.
The proposer reads source DATA and issues no compiler authority or installation.
The complete native source cohort and receiving cases now retain
all466 prior equations with16continuations appended. Qualification remains unrun.
Loops/assignment, recursive function emission, wider
ownership/effects/types/interfaces and actual production adoption remain open.
This partial R02/F01/V02/B04 increment closes no acceptance bundle.
