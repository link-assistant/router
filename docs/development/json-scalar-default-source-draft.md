# JSON boolean and integer default source draft

All implementation and independent case source is drafted and unrun. Full
translation, production coverage, parity, synchronization, freshness and receiving
qualification remain unfinished.

Three scalar fallback interfaces copy the complete existing bool/u64/i64 native
field-reader functions. General rules add the actual scalar fallback parameter,
project Option<T> to T, and wrap the unchanged match with unwrap_or(other).
Repository rules rename the actual function tokens. Together with the borrowed
empty-string reader, the field catalog now contains10 finite interfaces.

Matching JS wrappers reuse each original canonical field/scalar read and the
existing native-domain Option unwrap_or validator. False, zero, signed MIN and
full-width u64 values remain present values. Every eager fallback retains its
actual bool or exact integer range, without coercion. Forward rules retain native
primitive identity and by-value ownership; all three reverse source-checker
variants preserve actual arity, key/receiver/root checks and matching fallback
domains, including contextual positive i64 literals.

Source adoption fuses only recognized canonical readers followed by a closed
matching bool/integer literal or unwrap_or_default. Other fallback expressions
keep their source and evaluation order. The actual ABI still supports an eager
already-evaluated fallback argument in both languages. Runtime source retains
the original flat target imports and declares its required Option/text
dependencies; receiving qualification remains unrun.

The reusable native function-copy producer now composes bounded same-target
source successors, retaining complete earlier physical originals and Rust CST
boundary inverses. Every source/profile/current/original input is freshly read;
no source/hash/owner/verdict/result cache crosses operations and no source DATA
becomes a namespace, type, ownership, grammar or executable certificate. Eleven
complete JS/TS equations accompany the native scalar and preceding borrowed
reader histories. HostContracts and all eight same-SHA JS gates are untouched.

Independent unrun source covers defaults versus false/zero, missing/wrong-kind
and integer boundaries, eager operands and noncoercion, original/adopted caller
APIs and fixed bulk emission, emitted JS/strict TS, reverse arity/domain refusal,
both interpreters, full native/type reproduction, history/export and Rust oracle
callers. No parser, translator, preparer, generator, test or compiler was run
locally, and no CI feedback was inspected during the bulk source draft.
