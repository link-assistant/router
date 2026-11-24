# Preserve original canonical type owners through normalization

The focused batch at `c21347b0bb91d2d9a072327adcf1243afa99e885`
passes all 130 cases in both Node 20.19.4 and Bun 1.4.3, with no
skips. Node took 25.539 seconds; Bun took 15.912 seconds. The 16-file
batch covers the new six occurrence-provenance cases and existing
public reexports, namespaces, source links, ownership, lifetimes and Copy
checks. All 1,359 hashed inputs and the clean tracked head remained unchanged
during each engine run.

Generated generic arguments retain the canonical owner of their actual
original parsed type occurrence. Private WeakMaps associate a successful type
resolution with its parser, consumer scope, exact path and original span;
normalization checks that association before resolving a path again. A new
source-written private path cannot borrow an earlier public occurrence.
Different parsers, spans, scopes, targets and namespace configurations refuse
the association. Metadata-preserving copies of the same original occurrence
retain it, as required by the host generic argument machinery.

All three paired attempts are retained. The initial attempt passed 128 of 130
cases in each engine: one fixture incorrectly expected nominal fixed-array
Copy support, and another used the standalone parser for a source import.
The repaired attempt also passed 128 of 130: a missing saved state could compare
two undefined alias values as equal and then dereference that state. The final
repair requires the state to exist. Both the new freshness negative and the
existing standard-identity negative now pass. No failure log was discarded.

The [receipt](router-759-current-canonical-types-c21347b0-receipt.json)
records exact commands, deadlines, heads, input hashes, counts and limitations.
The [compressed evidence](router-759-current-canonical-types-c21347b0.tar.gz)
contains all six raw logs, receipts and input manifests, plus the exact focused
and archive helpers. All 20 members were reopened and their hashes verified.
The archive is 505,128 bytes with SHA-256
`f9bc958223696fe6f3d248cfb3d274d0313e31d06a9f1fd8c82840acdd9780c4`.

This batch ran no canonical or profile producer, complete JavaScript gate or
Rust build. It does not establish a whole-corpus gain or runtime parity. The
unchanged retained-original login fixture still requires a fresh canonical
producer and both-runtime verification by the push gate owner. Reported child
maximum RSS is neither aggregate process-tree peak nor physical footprint.
