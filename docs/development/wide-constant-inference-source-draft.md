# Deferred wide source constants

All implementation and independent cases are UNRUN source drafts. No coverage,
parity, freshness or full-drafting completion is claimed.

A complete copy of the existing function-local vector inference engine adds
private identities for source literals beyond the default unsigned/signed 64-bit
range. Actual decimal, binary and hexadecimal spellings retain the existing
128-bit bounds. Unqualified immutable pure literal bindings and aliases may be
substituted at each actual typed use, retaining complete original source/CST
evidence. Typed locals keep their declared width and eager operation initializers
remain evaluated. The original inference API and numeric-literal APIs stay exact.

Only a genuine current WeakMap entry can identify a deferred literal or issue
its fresh copy. A copied public shape cannot create that identity. A real
imported primitive operation, typed callee argument, written result or precise
typed value can establish its domain. Reification checks the exact primitive
range. Pure literals and literal-only choices do not establish a width from
their values, even when only one primitive could represent them. Default-sized
literal leaves may join an already deferred literal choice without becoming
typed anchors. Conditions and their evaluation remain in the checked tree.

Vector constraints continue to resolve only inside the current function, with
the original variable/element/depth/work limits. The final walk rejects every
remaining private scalar literal as well as every unanchored vector variable.
No private literal kind may reach emission, checked public IR or a later
invocation. No source, hash, owner or result cache crosses operations.

Three complete source equations select the copied inference engine in the
actual source checker and compose the producer leaf. Whole frozen originals,
lossless CST/meta transport, complete inverse substitutions and language then
repository phases remain. Independent source cases cover unsigned/signed 128-bit
extrema, alias chains, typed imported operations, inline literal choices, scalar
comparisons, helper arguments, JavaScript/JSDoc, binary/hexadecimal spellings,
range/anchor/type refusals and private identity. Independent Rust oracle source
is reserved for fatal CI after all eight same-SHA JavaScript stages pass.

Deferred scalar choices stored in locals, unannotated wide scalar return joins
without an earlier typed context, broader collections, cross-module calls,
actual native owner closure and full drafting remain OPEN. Complete compiler
exports/receiving, profiles, performance, canonical/reverse freshness, parity and
CI remain OPEN. No parser, translator, preparer, compiler or test was executed;
CI feedback remains uninspected throughout this drafting phase.
