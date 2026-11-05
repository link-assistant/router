# Shared ASCII and split operation source draft

Every implementation and new case is UNRUN. Only source construction and review
were used. No runtime, compiler, translator, preparer, generation, test or
experiment executed; local Rust and CI-triggering pushes remain forbidden.

Eleven additions extend the existing concrete text family: ASCII lower/upper
casing, ASCII detection and equality, three ASCII trims and the left/right
projections of first/last string splits. The existing single text catalog drives
forward checked calls, reverse JS/TS/Rust calls, runtime packaging, interpreter
dispatch and declarations. The draft extends those existing paths together;
there is no parallel name-only lowering route.

Native implementations delegate to Rust library methods behind the existing
bounded facade. JavaScript validates primitive Unicode scalar strings and the
existing one-MiB UTF-8 input bound for every parameter. ASCII mapping changes no
non-ASCII scalar and preserves byte length. ASCII whitespace includes tab, line
feed, form feed, carriage return and space; vertical tab, nonbreaking space and
the Unicode byte-order mark remain unchanged. Equality folds ASCII letters only.
Splits preserve first/last selection, empty patterns, overlapping matches,
Unicode boundaries, absent results and empty successful results.

Trim and split contracts retain receiver-root borrowing, and split results keep
the existing tagged optional borrowed-text ABI. New APIs reuse current source,
type, ownership and whole-body checkers. Native/runtime source text, catalog rows
and spelling observations do not supply authority. The facade's resource bound
prevents unrestricted application migrations: real callers still need their
actual binding, input, ownership and successful-resource qualification.

Nine complete compiler source equations retain original implementations, native
owner spans, separate language/repository substitution sequences and serialized/
reparsed whole CST inverses. A copied complete native source constructor retains
the exact pre-ASCII file and both phases. The previous SHA source constructor
joins its complete historical output to this exact native descendant; its
original append and intermediate output remain explicit. No old source history,
test case or native oracle is removed.

Independent fixed vectors, runtime refusal cases, actual qualified Rust caller
source, emitted JS/strict TS source cases and all eleven JS/TS/native inverse
cases are drafted. Native oracle source separately calls Rust library operations
and checks borrowed storage and parameter bounds. No receiving, coverage, timing
or parity result is claimed. Wider language/production/namespace and owner
closure, synchronization/freshness/CI repairs and every unfinished ledger row
remain open.
