# Concrete JSON reader defaults source draft

All new code and independent regression sources are UNRUN. Source writing and
review executed no translator, normalizer, adopter, preparer, tests, experiments,
generation, Rust tool or CI-triggering push.

The complete JSON reader selector now composes a zero-argument unwrap_or_default
after six known read-only scalar contracts. The concrete defaults are borrowed
empty text, false, unsigned/signed integer zero, positive binary64 zero and unit.
Collection/number references, arbitrary Default implementations and custom
callbacks remain outside this substitution family.

The language equation captures the actual optional receiver once, matches the
fully qualified standard Some constructor, retains the payload in the present
branch and uses only its concrete fixed default in the other branch. Repository
rules bind the generated Some path to the existing paired Maybe abstraction.
Nested reader paths are relocated into this equation by construction. Both
complete sources, intermediate CST/meta, ordered phases and all physical inverses
remain available before fresh whole-function source/type/ownership checking.
Borrowed text retains its input root on Some and a static empty default on None.

Four full compiler equations retain original modules and native owner spans.
No new runtime API or generated target is hand-edited. Independent unrun
JS/strict TS/native sources cover missing/null/wrong kinds, empty and Unicode
text, native borrowed storage, integer extrema, binary64 signed zero, unit,
unknown defaults, comment preservation and source inverses.

This is an explicit concrete API adoption proposal, with no blanket proof of
Default dispatch, Drop equivalence or executable admission. Actual callers,
source banks and exports, forward/reverse synchronization, full generation and
strict parity, eight JavaScript stages, gated Rust CI and receiving qualification
remain unfinished with every other open bulk requirement.
