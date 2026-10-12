# Source-derived borrowed whitespace iterators

The 24-file focused batch at
`f42be70a63ca7e0b16fdc2c6578928b32f957fd3` passes all 144 cases in
Node 20.19.4 and Bun 1.4.3, with no skips. Node took 60.945 seconds,
including the 0.177-second deterministic table check; Bun took 41.987 seconds,
including its 0.132-second table check. Both engines verified the same 1,375
hashed inputs on an unchanged clean tracked head.

The 15 new cases cover Rust 1.89's pinned Unicode 16 whitespace lookup across
every scalar value, all 25 separators, borrowed fresh cursor consumption,
primitive namespace identity, source freshness and genuine checked meta
serialization. JavaScript and independently strict-compiled TypeScript run
the same cases. Original `split(IsWhitespace).filter(IsNotEmpty)` and iterator
definitions remain pinned and licensed; generated table bytes are checked
against the source-derived, serialized and reparsed meta representation.

The unchanged whole `src/deploy/runtime.rs` translates `compact` and executes
the expected Unicode and line-break cases in both targets. The other two new
whole-file fixtures retain their original parent/import refusals. No source
imports, attributes or original function bodies were edited to gain admission.

Both initial runs passed 142 of 144 cases. Two older whole-file storage and
Responses fixtures still refused admission, but the new primitive identity
guard produced an earlier exact refusal. The repair updates only their expected
message and adds a changelog fragment. Original source/item hashes, spans,
false executable admission and false runtime parity assertions are retained.

The [receipt](router-759-current-whitespace-f42be70a-receipt.json) records all
four runs, exact commands, deadlines, input hashes, resource scope and limits.
The [182,844-byte evidence archive](router-759-current-whitespace-f42be70a.tar.gz)
retains every raw log, receipt and input manifest, plus the exact helpers.
Its SHA-256 is
`5b4d43292a92232918f6121744d577b48499be9bdafc60c0ae10e54e91d32d75`.
All 14 members were reopened and hashed; two exact duplicate manifests use
tar hardlinks, preserving their complete bytes and original member names.

This evidence contains no canonical/profile producer, complete JavaScript gate
or Rust build. Full-corpus gain, runtime parity and complete translation remain
unproved. Child maximum RSS is not aggregate process-tree peak or footprint.
