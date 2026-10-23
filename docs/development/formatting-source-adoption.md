# Apply formatting substitutions to actual Router callers

The 2026-10-23 batch runs the existing source-backed formatting producer against
all 565 physical `rust/src` files at `3310f10d3a74b59e5c2ce42ee632b6dc80ef9cda`.
It retains 4,304 complete Rust/Cargo/compiler/script/TypeScript inputs (241,323,060
bytes), including all 132 installed TypeScript 5.9.3 source files. These input
observations supply no compiler authority.

The complete proposal selects 125 functions in 50 files. Repository CST rules
qualify formatting calls through `crate::translation_core::format!` and selected
text types through the existing `Str`/`Text` aliases. The native facade still
delegates to the same standard-library formatting implementation; its internals
remain untranslated. Language checking, supported operand domains, ownership,
format grammar and target runtime validation remain required independently.

The producer preserves 312 file skips, including files outside the entry module
graph, unresolved derives/attributes, unknown macro producers and ambiguous
format bindings. It does not erase these obligations. The producer, independent
review and application retain every complete source/CST, edit, inverse, original
input and per-file recovery preimage. No generated JavaScript body is edited.

Observed bounded results:

| Workload | Wall time | Sampled aggregate peak RSS |
| --- | ---: | ---: |
| Complete proposal | 318.447 s | 1,601,536,000 B |
| Independent full packet/input review | 23.988 s | 333,152,256 B |
| Exact 50-file application | 34.066 s | 265,420,800 B |
| Five complete formatting suites, Node, 31 cases | 85.255 s | 722,862,080 B |
| Same complete suites, Bun, 31 cases | 65.675 s | 961,658,880 B |

The complete actual `codex_remote_control` module provides a receiving regression.
Its URI helper refuses `format!` before adoption, then translates and executes
eight independently authored literal cases in JavaScript and strict TypeScript.
The fixture retains the entire original proposal; both concrete documents and
all source inverses are checked again. The actual current Rust module is used,
including its separate CI-only oracle. The receiving project retains the whole
real crate root, selected module and complete compatibility core; other crate
modules remain unresolved. This demonstrates a real body under that receiving
scope, not whole-crate executable coverage or runtime parity.

The independent cases are shared in
`parity/fixtures/translation/uri-path-query.json`. Rust oracle source covers empty
queries, existing query punctuation, Unicode, NUL and literal question marks.
No Rust tool runs locally. Obtain its result in CI after all eight JavaScript
stages pass for the same immutable commit.

This batch does not establish 125 newly executable functions. Refresh the
complete physical source bank, current compiler exports, canonical/platform
outputs and reverse outputs, then measure the actual complete production
functions. Full parity, deterministic synchronization and the complete same-SHA
gate remain required. The separate source-composition test's observed
69.314-second run still exceeds its unchanged 60-second deadline; its passing
assertions do not make that run green.
