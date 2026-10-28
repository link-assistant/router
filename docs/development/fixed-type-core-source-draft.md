# Explicit paired scalar type core source draft

All implementation and independent cases are SOURCE only and UNRUN. No local
parser/translator/preparer, tests, compilation, experiments or CI feedback were
executed or inspected. Full source drafting and complete translation are unfinished.

A separate native compatibility module exposes U8/U16/U32/U64/U128,
I8/I16/I32/I64/I128, Bool and F64 as exact qualified standard primitive aliases.
Its implementation is derived from the actual complete owned Str alias template;
standard library internals remain intentionally untranslated. The same existing
checked fixed/bool/binary64 meta types drive JS bigint/boolean/number and strict
TypeScript emission, preserving existing guards and semantics. No new value ABI,
pointer-sized assumption, coercion or unchecked primitive spelling is introduced.

The parser bridge copies the existing borrowed-text protected interface approach.
It requires the genuine current private parser, original module/source views,
private resolved scope origin, exact active external module declaration, unique
actual root type binding and complete native library. Full library CST is
serialized/reparsed through language then repository rules, and source/root/
profile/cursor/token identities are rejoined after callback-capable work. The
scalar domain comes from the actual original monomorphic alias declaration/RHS,
not a copied public contract descriptor; that original item/view is rejoined too. CFG,
renamed/use shadows, changed or copied native data and fabricated parser/scope
records cannot supply this owned interface. A lexical role table supplies source
candidates only. Public alias names, source hashes or descriptors do not grant
native type, ownership or executable authority. Every selection is fresh; no new
cross-operation source/owner/hash/verdict cache is introduced. The host contract
module stays at its original 998 lines by extending its existing interception.

Ten complete compiler equations and separate complete two-file native source
construction retain actual template/root originals, native owners, full CST,
ordered phases and source inverses. New library creation records its distinct
source origin and absent target-before snapshot; root changes retain their actual
existing target-before bytes. Construction does not execute an installer. Independent unrun source covers all twelve
alias domains, complete semantic meta round trips, JS/strict TS boundary/extreme/
NaN/signed-zero/no-coercion behavior, changed/missing/shadow/CFG/fake interface
refusals, whole/mixed paired source inverses preserving explicit original Rust
headers, actual native sizes/limits and receiving export closure. The new native
module is registered in the actual Rust library; Rust checks remain CI only after
all eight same-SHA JS stages and failures remain fatal.

Code can explicitly use crate::translation_fixed_types_core::U64 and the other
registered paths. Broad automated adoption of these paths across actual production
source still requires its own complete type-position/source-binding/substitution
rules and original invariants. This draft does not rewrite unknown primitive
bindings or certify their equivalence. Global namespace/macro/export/type-prefix
closure remains OPEN; so do wider source constructs, actual production coverage,
full forward/reverse/sync/freshness/parity, receiving/performance and delivery.
No executable coverage gain or verified completion is claimed.
