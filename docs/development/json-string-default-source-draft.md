# Borrowed JSON string default and reusable native source copies

All implementation and independent case source is drafted and unrun. Full
translation, production coverage, native parity, synchronization, freshness and
receiving qualification remain unfinished.

Actual Router callers commonly read get(key).and_then(Value::as_str).unwrap_or("").
The new finite json_str_field_or_empty boundary copies the complete existing
native field reader, preserves its match and conditional scalar read, and returns
the original borrowed string or a fixed empty string. It does not allocate an
owned String. The Rust signature ties the output only to the JSON receiver; the
lookup key cannot become the output borrow root. Native library internals remain
behind the paired compatibility interface.

The JS implementation copies the existing canonical field/scalar reader call,
then selects its Some payload or empty literal. Matching declarations, native
source, relocated runtime source and forward borrowed-str checking are drafted.
Both ordinary and source-bound field selectors consume only the exact empty
literal or unwrap_or_default after a recognized canonical as_str reader. Other
fallbacks retain their source and eager evaluation. Existing reverse data-driven
field paths retain their complete source and live input-root checks.

The reusable native-rust-function-copies module applies bounded complete function
copies and exact type/body edits as language rules, then renames actual function
name tokens as repository rules. It serializes/reparses full Rust CST and retains
both full source inverses. Complete original functions, archives and current
physical source are freshly rejoined. It issues source DATA only, with native
Rust grammar, namespace, ownership, type and executable authority all absent.
Eight JS/TS equations accompany the native source plan. No cross-operation source,
hash, owner, verdict or result cache is added; HostContracts and all CI gates stay.

Independent unrun source covers missing/null/wrong-kind/empty/Unicode and numeric
keys, getters/coercion refusal, actual caller variants and fallback preservation,
fixed bulk emission into JS/strict TS, reverse and both interpreters, native copy
freshness/export closure, and native borrowed-pointer equality. No parser,
translator, preparer, generator, test or compiler executed locally; CI feedback
remains uninspected during the entire bulk source draft.
