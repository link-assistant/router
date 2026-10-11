# Locked float-roundtrip source equivalence frontier

This audit is SOURCE-INFERRED. It neither executes Rust nor claims that an
upstream program produced the reported bits. All authored integer inequalities
and runtime cases are UNRUN. The current parser capability denial remains.
Original full-file hashes, selected exact snippets/spans and the complete
reproduction text are in source-counterexample.json. All inputs are from the
checksum-locked serde_json 1.0.151 archive; the archive and licenses remain in
the portable json-macro source profile.

## Concrete integer-padding discrepancy

Let N=((2^53+1)*5^53)*10^715. N has769 digits. The JSON number N followed by
`e-768` is exactly 1+2^-53, halfway between binary64 1 and its successor.
Nearest-even rounding selects bits3ff0000000000000.

Original de.rs preserves the complete integer in scratch. lexical/parse.rs
removes trailing zeroes from the fraction only, so its integer retains715
padding zeroes. Its u64 prefix is10000000000000001110;749 discarded digits and
the written exponent-768 give moderate mantissa exponent-19.

The actual small cached power10 produces mantissa6250000000000000694 and
exponent4. The large10^-20 entry is mantissa13611294676837538538, exponent-130.
With A the small product, B that cached mantissa, and T=2^62+512, the exact
integer inequality is:

```
A*B + 2^63 - T*2^64 = 7385260164874040924
0 <= 7385260164874040924 < 2^64
```

Thus the original rounded upper product is T. Normalization produces
fp=(2^63+1024,-63), error count26, and low eleven bits1024 at halfway1024.
The source accuracy predicate refuses this approximation. Its downward float
is1; the fallback therefore compares against the exact halfway1+2^-53.

bhcomp.rs reads768 digits and appends a sticky1 whenever any input digits
remain. The omitted integer tail is actually just zero, but the source still
constructs N+1 at exponent-768. Its theoretical halfway coefficient is N.
The Greater branch selects f.next_positive(): source-inferred
bits3ff0000000000001. The exact4096-digit draft instead selects1. Consequently
it cannot replace the entire pinned parser domain as-is. This trace does not
authorize fixing or silently replacing upstream semantics.

## What the narrower proof closes

Every finite binary64 halfway boundary has form k*2^e, with odd k<2^54 and
-1075<=e<=970. For e<0, its terminating decimal coefficient is k*5^-e and is
bounded by (2^54-1)*5^1075<10^768. For e>=0, it is bounded by
(2^54-1)*2^970<10^309. Hence768 significant digits suffice to locate every
rounding boundary. This does not justify a sticky1 for an all-zero integer tail.
At most768 total input mantissa digits avoids that synthetic digit entirely.

The concise fast branch has one-rounding algebra: a coefficient<=2^53 is exact
in binary64, and10^n for0<=n<=22 is exact because its odd coefficient5^n fits
53 bits. One multiplication/division then rounds the exact rational once in
the declared ordinary nearest-even environment. The disguised fast branch
first checks an exact u64 multiplication and the same53-bit bound.

## Remaining moderate/fallback obligations

The private cached-array verifier is authored, not executed. It checks all ten
small and66 large entries against exact powers within a strict one-unit error
envelope. Tables cannot simply be assumed nearest-rounded:10^-20 is a floor
approximation with error greater than half a unit.

The source's error counters4/9/13 must dominate coefficient truncation,
normalization, two upper-product roundings and cached-power error. Initial
truncated coefficients are at least1844674407370955161, so normalization shifts
at most three bits. That one minimum prefix can still multiply by ten without
overflow even when its next digit would overflow. Its66 table cases need a
finite interval/acceptance proof, not a blanket normalization bound. The
multiply-by-one truncated path also needs its actual table envelope checked.
No complete acceptance lemma is asserted from the numeric constants alone.

Both original build.rs limb selections32/64 must preserve bigint add/multiply,
power tables, high-bit/sticky extraction and half-way comparison. Source pins
include the whole math/table files and exhaustive build-script branch; no target
is selected. Decimal-prefix itoa formatting and byte-position memchr helpers
remain explicit library lemmas rather than a whole-dependency behavior claim.

## Reader and effect boundaries

Original unsigned/signed integer classification stays independent: ordinary
integers fitting u64 retain U64, negative nonzero integers through2^63 retain
I64, and negative zero becomes F64. Exponent overflow reports range errors for
nonzero positive overflow before consuming later digits; zero/negative overflow
returns signed zero. Short exponent saturation and long exponent scaling agree
on far-underflow zero in the proposed bounded mantissa domain.

de.rs error() uses read.position(); peek_error() uses read.peek_position().
Pinned SliceRead takes index versus min(length,index+1), and StrRead delegates
these operations. Error categories map range/invalid number to Syntax and EOF
to Eof. This is the byte-reader contract for Value-from-str/slice, not IoRead,
Number::from_str, f32 or arbitrary_precision. Current default behavior remains
separate. Inputs beyond a future checked bound must be an unsupported domain,
not fabricated Rust syntax errors or automatically admitted dynamic strings.

The next source-only implementation now preserves the actual selected lexical
branch rather than requiring its approximation to equal ideal rounding. It
keeps upper products, error predicates, actual downward b, negative half-way
comparison and positive hi64/sticky native rounding. This sidesteps a blanket
moderate-accuracy theorem while preserving its possible original quirks. The
reusable source mantissa operation retains the original sticky rule for future
auditing; JSON inputs exceeding768 raw mantissa digits remain refused.

The bounded bigint proof uses base q=2^B, B in{32,64}. Source scalar product plus
carry is at most(q-1)^2+(q-1)=q^2-q; a grade-school product with prior result
limb and carry is at most(q-1)^2+2(q-1)=q^2-1. The actual low/high splitting
and overflow-return additions preserve this polynomial, with neither wide
overflow nor lost carry. High64 exports floor(N/2^(length-64)); its sticky bit
is exactly whether a discarded low limb/bit is nonzero. Source native rounding
uses that sticky only when the retained bits are halfway, then performs carry
and overflow adjustment before encoding the binary64 bits.

A conservative positive fallback bound is1093bits, at most35 u32 or18
u64 limbs (moderate exponent<=309 and at most20 retained prefix digits). Its powers-of-five multiplication remains in scalar chunks under
the source combined-size threshold64. Negative comparison starts with at most54
bits and at most1099 powers of five in this domain: a true overflowing u64 prefix
contains at least19 nonzero-starting digits, so the scaled exponent is at least
-350+19-768=-1099. Leading fraction zeroes cancel in the exponent/count formula. A32-bit1024-power
case pairs a75-limb cached power with a partial of at most7 limbs; the source
uneven path splits it into at-most7-limb grade-school products. A64-bit case
stays in scalar chunks. Original power-table values and these bounded dispatch
invariants still require focused arithmetic validation before admission; no
general balanced-Karatsuba or allocation behavior is asserted.

No checker/runtime admission is drafted on these unverified source lemmas. Constant
source strings could later be conservatively proven in-domain after branch
closure; unknown input domains remain carried. Scratch/BigInt allocation,
linked allocator/OOM and drop behavior are still separate application-effect
obligations. Runtime/native parity and complete application effects remain false.

The direct branch witnesses select the same actual runtime paths as the numeric
APIs; no caller chooses a fallback. The authored normal halfway with concise
mantissa10000000000000001110/exp-19 witnesses negative comparison. Truncated
9007199254740993/exp0 has normalized2^63+1024, exact cached10^0, errors18 and
low11bits1024, so it witnesses positive bigint fallback. These are still UNRUN.
Zero/all-zero direct truncated inputs are an explicit rejected precondition;
the source reader selects concise parsing for zero rather than entering bhcomp
with a trimmed-empty digit slice. No new parser admission follows this evidence.

A private original-source arithmetic verifier now checks100 power entries (72
small scalar powers and28 large limb arrays), including actual14-entry dispatch
order for each32/64 variant and all source declaration spans/hashes. Its two
authored cases are UNRUN. Table arithmetic and carry inequalities alone do not
certify loop equivalence, bounded branch dispatch or hi64/sticky extraction;
those proof fields remain false and cannot grant parser admission.

## Mechanically extracted source recurrence unit

The next isolated draft adds a reusable bounded parser/interpreter that extracts
original functions, then serializes their literal operator, binder, statement,
match and mutable-limb loop IR. It mechanically selects scalar::mul/imul,
small::imul and u64_to_hi64_1/2 from pinned math.rs; five authored cases are UNRUN.
No source function body is replaced with hand-written multiplication or sticky
logic in this unit. Source spans/hashes and IR are retained. Both Limb/Wide
interpretations are projected separately, with ordinary fixed unsigned cast,
nonoverflow addition/product and leading-zeros arithmetic assumptions stated.
Debug assertion conditions constrain the projection; their actual macro owners
remain unproved. AsCast/AsPrimitive macro-generated cast behavior remains a
source-owner frontier, not resolved merely by the helper's spelling.

This unit does not yet lower the source slice-trait forwarding, vector slice
selection/enumeration, long_mul/uneven dispatch or pow5 loops. Those remain
explicit obligations, as do arbitrary borrow aliasing, general Karatsuba,
allocation/abort and custom architecture/compiler configuration. The private
source wrapper cannot be cloned to grant authority. It provides actual source
recurrence progress and independently stated mathematical outputs, without
authorizing the parser or claiming production Router function execution.
