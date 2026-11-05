# Scalar character text pattern source draft

All new implementation and independent cases are UNRUN. Only source construction
and review occurred. No decoder, selector, parser, translator, preparer, test,
experiment, generation, local Rust tool or CI-triggering push executed.

The complete existing immutable text-method selector and corpus proposer are
copied through source substitution rules. Ten existing method shapes can use an
actual scalar character literal in their pattern position: contains, starts_with,
ends_with, replace, replacen, strip_prefix, strip_suffix, matches/count and the
existing exact left/right split_once/rsplit_once identity projections. Router
callers contain character prefixes, separators and quote trimming; this is a
shared source rule, not a production migration or executable coverage result.

The existing Rust scalar-literal decoder supplies the exact character. The
language sequence replaces it with a single-scalar Rust string escape. The
repository sequence then selects the existing qualified paired owned helper.
Repository spans are rebased after language edits with bounded sorted prefix
deltas and binary search. Every language edit must belong to one complete
selected expression. Both phases use the original serialized/reparsed CST
substitution path. The intermediate language equation and complete original to
final source inverse are retained.

Only literal pattern arguments qualify. Character receivers or method chains,
byte characters, arrays, dynamic patterns, character replacement values and
non-pattern string arguments retain their old refusal boundary. Invalid Unicode
scalars do not acquire a replacement. Mutable/shadowed inputs, unknown producer,
trait, closure and effect rules remain unchanged. Existing source/token/depth/
work limits and fresh whole-function semantic, ownership and target checks are
still required; old dispatch/Drop proof and executable admission remain false.

The paired operation catalogue, native implementations, JS runtime, strict TS
declarations and reverse helper mappings already describe the resulting calls;
no generated outputs or runtime/library internals are edited manually. Three
compiler source equations and independent unrun whole-source, source-inverse,
phase, Unicode/NUL/escape, JS/strict TS, refusal and native oracle cases are
drafted. Current native/source-bank/export checks, actual production adoption,
whole-source parity, reverse freshness, synchronization, CI and receiving
qualification remain open.
