# Genuine binary64 vector source draft

SOURCE ONLY. No compiler, parser, translator, preparer, test or experiment ran.
CI feedback remains uninspected. Full drafting and delivery remain unfinished.

The existing source-qualified f64 scalar profile now reaches owned vector comma
lists and bounded repetitions. It retains actual native f64 identity, source
qualification, Copy/value semantics and the existing seed/count checks. f32,
references, erased/nominal float-like types and custom Clone remain refused.
This supplies a shared prerequisite for the real subscription-usage f64 vectors;
it does not establish that their complete production functions translate.

The explicit reverse vector candidate adds finite number literal source,
readonly number-array targets and actual native f64 parameters. Negative zero
is stored as the string -0 across JSON/meta, emitted as -0.0_f64 in Rust and
retained in Number evaluation. Finite subnormals and extrema use canonical
binary64 round-trip decimal text. Nonfinite written literals, inferred NaN/
Infinity global bindings, arbitrary calls and BigInt/number coercions refuse.
Actual number parameters may carry NaN/infinities, as Rust f64 permits them.
The existing profile observes NaN classification, not its sign/payload.

Numeric literal construction checks the original native Number/String and
source intrinsics before and after conversion; it never evaluates source text
or calls a replacement Number constructor. Constructor observations are not
cached and no source/hash/owner/execution verdict survives a call.

Eight complete compiler equations preserve full originals, language/repository
sequences and exact serialized/reparsed CST inverses. Independent unrun source
covers actual forward lists/repetition, strict TS/reverse/evaluator, negative
zero, subnormals/extrema, NaN/infinity argument classification, bool branching,
wrong domains/annotations, noncanonical literal data and changed numeric host
refusals, plus native IEEE vector oracle source. Full production adoption,
source/reverse/sync freshness, platform pressure, receiving qualification and
all delivery rows remain OPEN. Rust remains CI only after eight same-SHA JS gates.
