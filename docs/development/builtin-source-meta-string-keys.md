# Invocation-local source metadata string keys

The explicit experimental `builtin-source-meta-string-keys-candidate.mjs` replaces
repeated string-tuple serialization used only for
metadata interning with a local `Map<string, tableIndex>` in a qualified native
DATA domain. Complete encoded table bytes, table insertion order, original
canonical checks and all fresh source/owner/hash operations remain required.
No runtime speed or coverage gain is claimed before receiving verification.

Under native JSON, `JSON.parse(JSON.stringify(['s', value]))[1]` reconstructs
every primitive string's exact UTF-16 units, including NUL, escapes, lone
surrogates and surrogate pairs. Thus equality of the old canonical tuple keys
is exactly primitive string equality. Other table nodes start with `a` or `o`;
they cannot collide with a string node starting with `s`. Splitting only the
string-key lookup into its own map preserves the single table's encounter
order and every returned reference. Existing node identity JSON remains fresh.

Selection starts with the existing captured-root ingress before broader
reflection. It independently pins the genuine Number constructor and its
`isFinite`/`isInteger` operations, so a numeric callback cannot change JSON
after earlier strings have selected the native route. Existing complete DATA
intrinsic guards remain fresh. The existing stateless native scan then checks
the entire graph, including its original cell, depth and unit bounds. Its work
is part of the operation and must be included in whole-file duration checks.
The temporary string map dies with one encoding call. It stores table indices,
and retains no source, hash, encoded output or eligibility verdict across calls.

Getters, proxies, lazy stacks, changed intrinsics and scan-budget misses retain
the original complete codec. No input is frozen or changed by selection. The
original codec's independent 16,000-table-cell, depth-64 and 524,288-byte limits
are preserved, including successes outside the optional scanner's domain.

`prepare-builtin-source-meta-string-keys.mjs` authenticates complete original
source fixtures, copies the actual encoder with TypeScript 5.9.3 AST factories,
checks the actual helper against that native copy, and serializes/reparses
complete language then repository CST substitutions and their full inverses.
The actual producer also restores the default codec to its complete original
bytes and verifies that equality on every `--check`. It compares every original
scanner API after removing the sole new export
and retains full support-source CSTs. Those source checks confer no authority.

The new complete nine-case test file covers exact UTF-16 identity, root and
interleaved table order, original JSON and inherited `toJSON` callbacks,
accessors/proxies/lazy stacks, numeric late mutation, changed global owners,
all independent bounds and fresh hash reissues. Source grammar/native-copy/CST
checks passed with TypeScript 5.9.3. The integrated 35-case Node controls and
57-case Bun cohort passed with original deadlines while the candidate was the
default. The original whole-library derive workload still took 100280.064041 ms
against its unchanged 60000 ms deadline. All twelve assertions passed, but the
independent deadline audit correctly failed. No performance improvement was
qualified. The subsequent explicit-candidate layout requires its own receiving
rerun; the complete gate remains open.

The stack fallback control uses one shared paired call site, preserving exact
captured source stacks across the original and current codec. Bun may capture
an eager own data string without calling `Error.prepareStackTrace`; Node may
invoke that formatter. The control accepts those observed engine behaviors,
formats actual captured frames when called, and checks both input stack strings,
their original own descriptor kinds, full callback/result equality and decoded
roundtrips. Getter and proxy controls still require their real callbacks. The
test does not substitute a constant stack or normalize different stack inputs.

The failed whole-library receipt is retained at
`/private/tmp/router-layout-check-metadata-string-keys-complete-original-derive-Node-v1`,
with complete Node audit `complete-S7JUdb`. It is not evidence that the candidate
caused a precisely measured regression: the earlier 92-second result is a
separate observation. It does establish that default selection has not met the
required workload. Preserve the experiment for further source-derived work
without adding its full eligibility census to production encoding.

Use the actual producer to reproduce the explicit layout:

```sh
node tools/translation/prepare-builtin-source-meta-string-keys.mjs --emit /tmp/new-string-key-proposal
node tools/translation/prepare-builtin-source-meta-string-keys.mjs --write
node tools/translation/prepare-builtin-source-meta-string-keys.mjs --check
```

The proposal retains complete candidate and default-restoration CST stages and
inverses. `--write` refuses unknown default or existing candidate bytes. The
nine complete behavioral cases now target that explicit candidate; all their
bodies and deadlines are retained. Ordinary compiler imports execute the exact
original codec. This separation claims no repaired performance or coverage.
