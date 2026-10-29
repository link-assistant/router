# Qualified scalar local domain source draft

SOURCE ONLY. All implementation, receiving batches and equations remain UNRUN.
CI feedback is uninspected. Full drafting, actual coverage, freshness, performance
and runtime parity remain OPEN.

Closed-family TypeScript locals can name bool/str/u64/i64 constructor parameter
domains through the actual imported fixed JSON constructor. The original native
import/declaration/runtime/root checks still resolve that symbol. A matching
spelling or unrelated declaration cannot issue the domain. Actual u64/i64 local
initializers use the existing checked literal/immutable-alias narrowing rules;
unproved dynamic conversions and out-of-range values remain refused.

TypeScript emission retains known u64/i64 local domains with qualified Parameters
witnesses. It adds a separate type-only import when no corresponding runtime
binding exists, avoiding duplicate aliases or additional JavaScript imports.
Canonical type erasure retains full CST/source inverses, and the fresh private
source checker rederives each domain on the next cycle. Native Rust emission,
unprofiled local typing and the separate primitiveOperators lane keep their
existing rules. For JavaScript-authoritative edits, the actual erased baseline AST and current
AST transplant explicit types only for corresponding immutable local declaration
paths and names. Initializer edits still undergo fresh bounded type checks; new
or relocated declarations receive no guessed type. Added traversal state is
bounded and cleared on every exit. No source/type/namespace verdict is cached
across operations.

Four complete source equations retain originals and language then repository
phases. Six local forms draft both authorities, positive/signed extrema, numeric
comparisons, aliases, branch scopes, strict target execution, false symbol and
conversion/overflow refusals, plus a fresh second synchronization. All are unrun.
Broader local/return/operator domains, automatic full-module projection and all
namespace/ownership/trait/synchronization/receiving/race/platform/performance/CI
requirements remain OPEN. Eight same-SHA JavaScript gates still precede fatal
CI-only Rust. No local test, compilation, parser or translator ran.
