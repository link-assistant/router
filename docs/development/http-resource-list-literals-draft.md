# Original owned JSON list literals draft

Dense actual JS/TS array literals now construct owned JSON lists. Every element
is independently checked as a complete owned JSON value, in source order. Moves
happen once; borrowed inputs need an actual copy operation. Holes, spreads,
non-JSON elements and more than 4,096 entries retain explicit refusals. Returned
lists, collection arguments, mutable owned slots and shared iteration compose
the existing source, ownership and backing-root checks.

Native emission uses the fully qualified standard vector constructor. The
canonical native reader/projection retains every original element and proposes
the complete list expression; the whole actual JS/meta/Rust path must reproduce
all native tokens. Unqualified unknown macro owners still refuse. The existing
empty JSON macro array contract remains distinct and unchanged.

Complete checker/reader/projection originals, native-selected language then
repository substitutions and full CST inverses are retained. Independent unrun
JS/strict TS/native source covers empty/nonempty lists, Unicode, owned moves,
collection calls, shared iteration, unknown macro owners, element/count bounds
and forged meta. A fourteenth independent native oracle joins gated CI discovery.
No test, preparer, translator, diagnostic, runtime or Rust tool executed. Wider
collection/language domains, namespace/bootstrap, production adoption/parity and
every unfinished bulk requirement remain open.
