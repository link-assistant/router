# Paired owned String vector core draft

Eight paired operations draft the reusable owned `Vec<String>` abstraction:
new, copy from a shared slice, consuming push/append/truncate/replace, shared
length and shared lookup returning a cloned owned optional String. Existing
primitive vectors and their public APIs remain unchanged. This family was
selected from actual String vectors in credential reporting, import diagnostics
and SSE output, rather than treating all array-like values as primitive Copy.

The native implementation is constructed by source extraction/substitution
from the complete existing primitive vector implementation. Its source profile
retains that entire original, ordered language/repository equations and every
inverse. Generic lookup changes Copy/copied to Clone/cloned, and the selected
u8 public family changes its element to standard owned String. Runtime input
and operation structure reuses the existing primitive family while validating
Unicode scalar strings with the actual shared string validator. Eight source
equations, fresh readers, strict declarations and matching native oracle source
are drafted. All implementation and case execution is UNRUN.

Both native and JavaScript interfaces enforce at most 4,096 values before
operations, including lookup and truncation. Length and indices use u64, with
no wrapping at host pointer widths. Out-of-range lookup returns None; replacement
refuses. Truncation above current length retains values. Input vectors above
the bound refuse even if the requested result would be small. Individual valid
Rust strings have no new byte/code-unit cap. Empty text, Unicode, NUL and combining
sequences are preserved. JavaScript boxed strings, coercible objects and unpaired
surrogates are outside the native String domain and are refused.

The JS carrier is an ordinary dense frozen array with exact own index/length
fields. Proxy, holes, accessors, non-string entries, extra symbol/string keys and
custom prototypes refuse without invoking element accessors or coercions.
Outputs are frozen; from-slice makes a fresh vector. Native get clones String;
the JavaScript representation is an immutable scalar string. This representation
does not prove native Copy, ownership or moves. Push consumes both vector and
String; replace consumes its vector and replacement String; append consumes both
vectors. Shared get returns independent owned text and no escaping input loan.
Those caller/borrow/type obligations remain the compiler's private responsibility.

The catalog carries operation roles and two fixed rule sequences as DATA, with
false caller/namespace/root/receiving flags. The fresh provider joins eight whole
inputs: native core, runtime, strict declaration, catalog, actual string iterator
validator, its whitespace dependency and the primitive operator runtime/type
brand dependency. Full current bytes, regular-file/descriptor/hash checks,
serialized/reparsed CST and every original physical closing fence are retained.
The shared source-failure relay invalidates caught/restored input failures.
All maps and source records are invocation-local; no source/owner/input/verdict
or failure cache crosses an operation.

Asset collection retains all six runtime/declaration/validator dependencies in
each receiving root, with safe path checks and complete original source bytes.
Separate runtime/declaration roots therefore contain twelve files. This is an
asset construction API, not evidence of translated callers or qualified parity.
The additive mixed source preparer preserves the original JS-only preparer and
keeps native Rust grammar/typechecking/compilation flags false.

Independent JS cases cover every operation, order and preserved input, fresh
copies, Unicode/empty/NUL text, u64 boundaries, exact capacity and overflow,
descriptor/proxy/coercion hazards, large valid text, every fresh pin, caught
restoration, mirrored assets, strict declaration use/refusals and complete
source equations. Independent gated Rust source uses the actual physical core
file and standard Vec/String expectations, including cloned ownership after
replacement, integer extrema and all bound panics. No Rust tool has run locally.

Native root publication, complete current ABI/source-operation joins, actual
Rust/JS/TS caller registration, linear text-vector and optional-string flow,
helper/loop/borrow/mutation integration, canonical inverse, bulk source adoption
and original production equivalence are still OPEN. The existing native-root
history is unchanged. The test oracle temporarily includes the actual core file
directly until the genuine public edge is drafted; it does not copy its body.
Receiving/export qualification, freshness, actual application coverage, parity,
all eight same-SHA JavaScript gates and fatal gated Rust CI remain OPEN.
