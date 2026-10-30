# Shared JSON collection-chain source draft

Every new implementation and independent case is UNRUN. The shared reader
selector now walks direct canonical JSON readers before later optional
substitutions, and permits its existing closed field callback on borrowed maps
and arrays. Map callbacks require a known string key; array callbacks require a
known usize index. Direct JSON callbacks retain the existing two key domains.
This adds no generic callback, mutable collection or new public input authority.

Closed JSON filter callbacks use the common nine predicates, with optional
negation. The explicit Some branch checks its borrowed payload once and returns
that same payload when accepted; None invokes no predicate. All five generated
constructor/callee positions are joined by construction, independent of source
strings. Arbitrary captures/effects/arguments, direct function items with the
wrong filter reference ABI, shadowed inputs and removed comments remain refused.
The lexical alias walker retains closed collection-field and filter roles under
its original delayed binding, parent restoration, root evidence and work bounds.

The existing native-body ok_or_else implementation remains the error-conversion
path, including lazy error construction. Four complete compiler source equations
retain original modules, native owners, language/repository stages, complete
CST/meta and whole inverses. Independent unrun JS/strict TS and CI-only native
cases cover collection key domains, original shared identity, missing/wrong kinds,
filters, immutable aliases, lazy errors and refusals.

No compiler, parser, translator, model, preparer, test, experiment, generation,
Rust tool or CI-triggering push ran. Actual native callback/owner closure, whole
production caller qualification, wider collections/mutation/effects, reverse
composition, exports/source banks, synchronization, freshness, parity and all
complete gates remain unfinished.
