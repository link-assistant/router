# Independent ordered-map finite-state and byte-boundary oracle sources

SOURCE DRAFT ONLY. Both JavaScript case sources and both native Rust oracle
sources are UNRUN. No compiler/translation/coverage/receiving/parity claim closes.

The independent JavaScript and Rust suites enumerate all64 states of three
ordered scalar keys (`empty`, `a`, `😀`), each absent or mapped to one of three
values (`empty`, NUL, `é`). Expected order comes from a fixed written key list,
not either implementation's sort or collection. Reversed construction inputs
and a superseded value exercise input order/last-write behavior independently.
Every state checks presence versus present-empty, values, key/pair projections,
length and original-map persistence. Each state applies every insert and remove
on every supported key:768 small-domain edit edges, plus64 absent-key removals.
These are assertions inside one source case per language, not832 separately
executed tests or a production coverage percentage.

A second source case per language checks an exactly1048576-byte supplementary
scalar value at the empty key, an equally long absent query key, all three query/
remove operations with a1048577-byte key, a smaller replacement, and independence
of the original after copies. Rust uses independently written `catch_unwind`
expectations for native panic boundaries; JavaScript checks exceptions from its
actual compatibility runtime. Neither suite derives expected values from the
other implementation or generates its expectations from operation descriptions.

Actual source paths:

- `tools/translation/test/ordered-text-map-state-space-20261102.test.mjs`
- `rust/tests/ordered_text_map_state_space_20261102_test.rs`

The native filename deliberately ends `_test.rs`: the current Windows release
workflow explicitly enumerates that suffix; the Unix workflow discovers all
integration tests. No CI workflow or outcome was executed or inspected to make
this source scheduling observation. Existing same-SHA eight-stage JavaScript
prerequisites and fatal Rust requirements remain unchanged. No local Rust tool
is authorized. JavaScript retains its60-second serial case deadline.

This strengthens the explicit ten-operation compatibility ABI contract only.
It does not qualify its native library owners, whole production callers, the
seven-operation caller translation draft, general collection/iterator behavior,
mutable aliases, named lifetime reconstruction or full JS/Rust synchronization.
The complete existing map runtime/caller/strict TypeScript/native source cases
and all original gates remain required after source drafting is complete.
