# Derive a smaller metadata dispatcher

`prepare-primitive-metadata-copy.mjs` selects the actual private metadata copier
with installed TypeScript 5.9.3. It copies the complete original host so the
factory keeps its actual native captures, fallback and private assignment fast
path. Its language rule moves the unchanged composite tail to a separate
function, retaining the original primitive prefix, parameter defaults, all three
recursive call expressions and complete source inverse. Its repository rules
make the other copied exports private, expose only the intended factory and
redirect the exact internal source-digest import. The existing public copier,
JSON/Hash expression and pinned `original-json-intrinsics.mjs` remain unchanged.

The copied original factory retains its original eligibility/fallback decision.
Both original cell/depth and UTF-8 byte budgets are charged at the original
recursive entry; there is no memoization or reuse of a prior input/result.
Copies retain original alias independence, key/certificate ordering, refusal
priority and native callback ordering. Every call receives fresh data checks.
The independent legacy copier remains available as the behavioral oracle.

Prepare a complete proposal with:

```sh
node tools/translation/prepare-primitive-metadata-copy.mjs --emit
```

Review complete native grammar, both serialized/reparsed CST substitution phases
and every source inverse before installing its two outputs with `--write`.
After installation, require `--check` and both engines' complete original
metadata controls plus actual receiving workloads. Do not change frozen input
hashes to accept unknown source evolution. The complete original source archive
is portable under `source-profiles/primitive-metadata-copy`.

The earlier primitive-call selector changed the text of the native
`Object.defineProperty` call. Bun includes that expression in some TypeErrors,
so matching values and callback tapes alone missed a real behavior difference.
The dispatcher keeps the original recursive calls and complete composite tail
verbatim, and the original intrinsic-rebinding/error controls remain required.

Existing private-copy contracts exclude private factory/copier stack equality.
JavaScriptCore can inline the primitive dispatcher completely. New stack
observations retain each engine's native output separately; they do not
normalize or compare source locations. The original independent Hash-frame
contract remains unchanged and mandatory.

This is a source-derived development optimization. It grants no source, owner,
type or semantic authority and does not increase executable application coverage.
Original derive-helper deadlines, full generation, strict TypeScript, parity,
reverse freshness and the complete JavaScript gate remain separate obligations.

## Receiving results

The final six complete files contain 39 cases. Node 20.19.4 passes all 39 with
its independent source-declared deadline audit. Bun 1.4.3 passes all 30 metadata
cases and all five typed-target controls, plus two of four original derive-helper
cases. The other two original derive cases time out at their unchanged 5,000 ms
default (observed 5,606.62 ms and 6,849.25 ms). The Bun batch remains red.
Both engines retain independent strict TypeScript 5.9.3 execution.

The complete Node batch took 122.383 seconds with 932,642,816 bytes peak sampled
aggregate RSS; the complete Bun batch took 80.278 seconds with 1,595,064,320 bytes.
These are bounded run observations, not a controlled before/after speed claim.
All remaining original workloads and the full gate retain their open status.
