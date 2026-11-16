# Monotonic credential token scanner source proposal

All implementation, independent expected cases, predecessor comparisons and
complete source/CST proposal work is **UNRUN**. No test, parser, interpreter,
compiler, Rust tool or benchmark was executed. There is no measured speed gain.

The actual launcher bearer/JWT algorithm visits original scalar positions,
recognizes ASCII-case-insensitive bearer prefixes or exact eyJ JWT starts,
then scans a complete ASCII token suffix and counts dots. Repeated invalid JWT
starts inside one long run can repeatedly scan the same suffix. That repeated
work follows from the source structure; it is not a performance observation.

`persistent-credential-token-scan-20261101.mjs` implements the same selected
primitive with invocation-local run start/end, counted-from position and suffix
dot count. After the first complete scan of a run, later candidates advance the
dot-count cursor forward through it. Accepted redactions jump to the consumed
end. Bearer candidate starts advance seven characters; a nonempty candidate is
consumed immediately, and an empty candidate cannot hide an intervening eyJ or
bearer start in the fixed bearer-prefix characters. Therefore subsequent real
candidate starts are monotonic. Text runs and suffix cursors cross each original
position a bounded number of times. Prefix comparisons inspect at most seven
characters without constructing a suffix string. No verdict/source/type/owner
cache crosses an invocation, and token positions grant no compiler authority.

Original leftmost selection, two-dot predicate, case handling, delimiter rules,
retained spelling, nested failed JWT suffixes, Unicode scalar boundaries and
empty bearer values remain explicit. The final output still requires storage
proportional to the produced text; successful-resource/native allocation/Drop
parity and the full persistent input domain remain separate obligations. No
original target or native limit is increased, and native Rust is unchanged.

`persistent-credential-token-scan-20261101-sources.mjs` retains the ENTIRE actual
35d7ebb8986c6d647a990b0c5b3117a4fcb432d9 text module and exact candidate successor.
The proposal replaces only the bearer/JWT function with a qualified helper call
and adds its import; all other functions remain byte-exact. Its source proposer
uses actual language then repository rules, serialized/reparsed complete CSTs
and a full original inverse. It installs nothing. The persistent profile must
join the exact original module, complete new helper bytes, runtime import/assets
and all full successor/closing checks before using it. A public source proposal
or matching digest cannot supply private source/type/ownership authority.

The17 literal shared expectations in
`rust/tests/fixtures/persistent-credential-token-runs-20261101.json` cover ordinary
and mixed-case bearers, original substrings, empty candidates, zero/one/two/three
dots, nested suffixes, punctuation and astral text. The complete new test file
compares both independent expectations and an actually imported COMPLETE frozen
predecessor module with the new helper. The receiving copy changes only that
full module's URL import specifier, retaining its complete CST and inverse; it
does not extract or reimplement a prior function. A repeated-prefix case checks
behavior without a timing assertion, and malformed scalar inputs refuse.
Both cases retain60-second deadlines and the original Node/Bun full-file globs.

The full backend's actual native sanitize wrapper/oracle can reuse these literal
vectors; those whole-native and strict-TS compiled-target source cases remain
separate work. This child proposal does not install the backend, qualify its
whole native/JS/TS semantics, prove full coverage, or close any parent requirement.
