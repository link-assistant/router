# Explicit carrier owning-text target source draft

All implementation and independent cases are SOURCE only and UNRUN. No local
parser, translator/preparer, tests, compilation, experiments or CI feedback were
executed or inspected. Full source drafting and complete translation are unfinished.

The existing written primitive/core role reader now supplies closed owning text
payload context for Option<String> and Result<supported scalar,String>. Original
String context remains available. Complete matching Some, Ok and Err source paths
select only a written owning payload; borrowed/scalar success payloads receive no
String conversion context. Root branches, expression blocks, closed nonbinding
match arms, typed locals and explicit returns reuse the same existing target
walker and conversion rules. Ordinary and qualified standard paths retain exact
argument source, including an optional trailing comma; unknown constructors,
turbofish shapes, argument lists and inferred/unknown payload types stay unsupported.

Source target context proves neither a standard constructor/alias binding nor
actual payload type, Into dispatch, ownership, effect, namespace closure or
execution. A shadowed constructor spelling must still pass the independent whole
original caller checks; this reader cannot supply that proof. Opaque callback
result contexts remain separate. The branch walker now recognizes a structurally
complete else-if even if that alternative has no owning conversion to select;
it no longer uses growth of its target map as a syntax test. This preserves an
owning error arm when a later scalar success alternative has no text target.

Five complete immutable source equations retain original native owners, language
then repository phases, full serialized/reparsed CST, physical inverses and all
prior source histories. Existing work/depth/input bounds, cache prohibitions,
ABI and all eight same-SHA JS prerequisites to fatal CI-only Rust remain.
Independent unrun source covers both adopters/eight complete callers/eleven edits,
JS/strict TS Unicode/NUL/empty/Option/success/error/branch behavior, qualified and
trailing-comma constructor bounds, nonowning/unknown/inferred/refused contexts,
original native borrowed identity and owning payload semantics and export closure.
Broader nested generics, aliases, pattern bindings and source constructs,
namespace/producer proof, production coverage, full forward/reverse/sync/freshness/
parity, receiving/performance and delivery remain OPEN. No executable gain or
verified completion is claimed.
