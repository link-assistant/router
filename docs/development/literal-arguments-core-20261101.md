# Owned LiteralArguments source draft

All cases, strict receiving, inverse checks and the Rust oracle are **UNRUN**.
The canonical compiler/facade and nominal0713 history remain unchanged. This is
an opt-in copied-source proposal, not an installed production output path.

The new native leaf retains only a borrowed static slice of static strings.
The qualified owned constructor accepts zero pieces or one direct original
literal. It does not identify `std::fmt::Arguments`, the builtin `format_args!`,
a lang item, a sysroot, or an observed unqualified production invocation.
`piece_count` and `byte_len` return fixed u64 (BigInt in JS); `is_empty` means
rendered UTF8-byte emptiness. Zero pieces and one empty string both are empty,
while piece_count distinguishes0 and1. Braces are ordinary data. Valid Unicode
and the existing2MiB UTF8 bound apply identically to native/runtime values.

The native fields are private. Its exact empty Drop implementation seals
move-only/coherence behavior; no application destructor can alter inspection
semantics. Runtime custody uses an operation-private WeakMap and deletes the
carrier on inspection; structural objects and copies cannot forge custody.
The current caller domain is synchronous and parameter-free, with immediate
inspection or one immutable local consumed once. Borrowed returns, as_str,
runtime arguments, formatting interpolation, aliases, captures and general
lifetime/loan flows remain unsupported. External impl targets outside the exact
owned facade/leaf must resolve to a different genuine original nominal family;
matching or unresolved targets refuse. This intentionally conservative source
closure does not admit arbitrary trait/macro producers.

`literal-arguments-core-20261101-profile.mjs` preserves full original0713
sources and virtual after-sources, then complete owned successors. The standard
source-profiles directory contains full immutable originals/nominal-after/current
snapshots and a bounded complete source archive. The proposed virtual hooks are:

- rust/src/translation_core.rs and router-core-source-data.mjs;
- extensions/host-contracts.mjs, extensions/source-links.mjs and owned-json-flow.mjs;
- project.mjs and the new safe-reader successor of the nominal helper;
- text-host-assets.mjs and type-layout.mjs;
- a complete new copy of forward-literal-synchronization.mjs with only the
  compiler adapter changed to the genuine combined entrypoint.

The original engine APIs and0713 wrapper remain frozen. The combined virtual
entrypoint enters exact complete installed-source, literal and nominal frames.
It preserves genuine source module/binding/call identities, actual parser raw
nodes, explicit Cargo edition2024, exact facade/leaf source, generated carrier
layout, private checked-host receipts, original flow and primitive checks.
Source/type/ownership authority never comes from public names, hashes, flags or
output annotations. The source-link addition carries original raw correspondence
only. The TS hook emits an opaque private-branded source-relative imported type.
The metadata's zero-field generated carrier cannot pass finalization through
ordinary unit/record/data construction: both actual constructor and actual
inspection need private same-owner/checker/original-source receipts.

Language then repository phases preserve real serialized/reparsed CST and full
physical source inverses. `visitLiteralArgumentsCoreSourceEquations` gives every
complete equation/CST boundary one bounded transaction at a time. The proposal
includes every full source and inverse; all returned DATA is bounded before
return. Physical readers bound allocation before read, retain original identity
and bytes, fence every exit and preserve falsy/frozen primary throws when close
also fails. Observed caught source failures poison enclosing original operations.
No persistent verdict cache exists.

`compileLiteralArgumentsCoreProject` checks a complete owned fixture source
universe. The copied real expression inverse maps edited emitted JS or TS
literal leaves into actual native literal edits, then freshly checks the entire
changed universe and reproduces targets. This is semantic inverse translation
for the qualified owned domain, distinct from unchanged physical restoration.
No executable lower/method facade escapes the nominal frame; only the original
fresh checkedSource and targetBinding DATA readers remain inside inverse use.

Independent cases include mixed nominal copied collections plus literal calls,
strict lockfile TypeScript5.9.3 receiving, actual JS/TS edited-literal inverses,
UTF8/scalar/empty/braces boundaries, original source/meta/namespace refusals,
private carrier constructor attempts, reuse/borrows and source-failure poisoning.
The CI-only native oracle imports the actual leaf, tests its real empty Drop,
fixed counts and static borrowed display behavior. It does not install the facade.

Remaining scope: native oracle/receiving execution, source-profile installation,
actual source migration into real application owners, owned output transport and
capture/logging semantics, dynamic format arguments/evaluation/lifetimes, original
builtin/lang-item/sysroot ownership, standard Arguments ABI and original macro
provenance equivalence. None is claimed by this carrier inspection batch.
