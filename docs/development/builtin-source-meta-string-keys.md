# Invocation-local source metadata string keys

This source draft replaces repeated string-tuple serialization used only for
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
It also compares every original scanner API after removing the sole new export
and retains full support-source CSTs. Those source checks confer no authority.

The new complete nine-case test file covers exact UTF-16 identity, root and
interleaved table order, original JSON and inherited `toJSON` callbacks,
accessors/proxies/lazy stacks, numeric late mutation, changed global owners,
all independent bounds and fresh hash reissues. Source grammar/native-copy/CST
checks passed with TypeScript 5.9.3. The nine cases, original metadata/proof
suites, original complete derive file and full gate remain unrun in this worker.

The stack fallback control uses one shared paired call site, preserving exact
captured source stacks across the original and current codec. Bun may capture
an eager own data string without calling `Error.prepareStackTrace`; Node may
invoke that formatter. The control accepts those observed engine behaviors,
formats actual captured frames when called, and checks both input stack strings,
their original own descriptor kinds, full callback/result equality and decoded
roundtrips. Getter and proxy controls still require their real callbacks. The
test does not substitute a constant stack or normalize different stack inputs.
