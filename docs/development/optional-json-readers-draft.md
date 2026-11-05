# Immutable optional JSON reader source draft

All implementation and independent cases are UNRUN. Source construction and
review executed no runtime, checker, emitter, compiler, preparer, tests,
experiments, generation, Rust tool or CI-triggering push.

The existing opaque optional borrowed-JSON interface now exposes all nine
read-only scalar/aggregate readers. Each concrete export reuses the complete
original carrier and frozen canonical-JSON validator before a fixed member
dispatch. None retains no JSON payload. Some preserves text, boolean, native
integer variants, finite binary64 including negative zero, unit, and original
borrowed Number/array/map storage. Integer reads never coerce Float variants.
Numeric conversion and integrity operations retain captured stock primordials.

The original 65536 occurrence-cell, depth-1024 and 1 MiB scalar-text work bounds
remain unchanged. Proxies, accessors, malformed/extra fields, lazy stack
properties, nonfrozen graphs, cycles, bad Unicode, invalid numeric tags/ranges
and nonfinite floats remain refusals. New borrowed aggregate views keep this
opaque interface's wider limits; consuming another operation does not raise its
separate limits. Input carrier records retain their original ordinary own-data
requirements. No unknown payload field observation or general optional input
admission is added.

The finite reverse operation table now records each fixed member and its root:
borrowed text/Number/array/map results keep the actual input root; copied boolean,
integers, float and unit have no loan root. Seven complete original checkers
retain the same actual-parameter/symbol/source/private boundary before calls.
Their Rust projections use the matching ordinary Some/None library equation.
All seven emitters import the canonical opaque parameter declaration witness
even when only a newly added reader is called, preserving matching strict TS.
New declarations derive their result types from existing checked JSON runtime
declarations; this adds no guessed numeric or aggregate type identity.

Eighteen complete compiler/library equations retain original modules, native
owners, ordered language/repository substitutions, serialized/reparsed CST/meta
and full inverses. Independent unrun JS, strict TS/private receiving and CI-only
native sources cover None versus Some(Null), wrong kinds, integer extrema,
negative zero, borrowed storage, original wide/deep limits, late primordial
replacement, malformed data and zero getter/proxy observations.

Actual original equivalence, whole caller qualification, source-bank/export
freshness, full production forward/reverse synchronization, parity, eight-stage
JavaScript verification, gated Rust CI and receiving qualification remain open,
along with every remaining source requirement.
