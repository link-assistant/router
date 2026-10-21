# Scoped builtin definition positions

`prepare-builtin-definition-positions.mjs` proposes one opt-in traversal index in the actual `builtin-derive-ast-meta.mjs` issuer. It preserves the complete original module, selects its recursive root scan with native TypeScript 5.9.3, and retains both language/repository CST phases, detached complete native AST copies, lexical binding checks and complete source inverses. The original source archive is 25,881 bytes with SHA-256 `e568e87935e993223b820a84c45f4aa1b9eca2d96a515f2adebd38a8bfca0ca5`. Its gzip is 6,971 bytes with SHA-256 `ceeb4436b00db5e94914e400f202f751e08e51c2b7354cfd2eb3a6b395e003be`.

After explicit source materialization, callers can use:

```js
import {withBuiltinAstDefinitionPositions} from './builtin-derive-ast-meta.mjs';

const result = withBuiltinAstDefinitionPositions(() => completeSynchronousOperation());
```

All existing callers continue through the original scan unless an operation frame is active. No project/default/Host import is redirected. The wrapper uses the same private issuer and genuine profiles as every original consumer. Copied or foreign fragments gain no authority.

Inside a qualified native frame, a complete immutable syntax-root walk indexes only enum/struct occurrence positions. It preserves duplicate occurrences and their traversal order; each lookup still constructs a fresh selected array and a fresh privately issued fragment. Unsupported selectors retain the original scan. The index does not retain JSON bytes, digests, source-owner facts, constructor validity or admission decisions. The original source lookup, native parse, complete JSON equations, `Hash.update`/`digest`, field sharing and fragment issuance tail remain unchanged.

The new storage capacities (16 roots, 200,000 visited cells and 8,192 definition positions) bound optional allocation only. A miss or exhausted capacity falls back to the original scan without changing its limits or accepted source domain. A failed observed intrinsic qualification permanently retires the index for that frame, even if the intrinsic is restored later. Reflection checks inspect descriptors without invoking newly installed accessors.

Each synchronous callback owns fresh indexes. Nested calls suspend the outer frame and allocate independent indexes; restoration resumes the outer frame. `finally` drops all index references on ordinary return, throw or rejected asynchronous result. Promise/thenable results are refused without invoking own or inherited `then` getters. The diagnostic facts accessor returns scalar allocation counters for the current frame only. Outside it, counts are zero; no prior source/index remains reachable through the new API. If native bootstrap qualification is unavailable, the explicit wrapper refuses; original unwrapped APIs retain their existing behavior.

The receiving file has seven complete cases covering full source equations, actual compiler definitions, exact original hash payload tapes, late JSON-hook fallback, copied/foreign/missing selection refusals, nested/exception/thenable cleanup, and duplicate/budget controls over the actual native-copied DATA builder. Its probe copies only the pure position builder and cannot issue compiler profiles, private fragments or semantic proof. All case deadlines remain 60 seconds.

Source materialization is explicit:

```sh
node tools/translation/prepare-builtin-definition-positions.mjs --emit
node tools/translation/prepare-builtin-definition-positions.mjs --write
node tools/translation/prepare-builtin-definition-positions.mjs --check
```

This draft has not been materialized, executed or benchmarked. The original production diagnostic spent 56.887 seconds in the enclosing derive creator before entering Default processing; its V8 summary identifies `originalAstDefinition` among several costs, without precise phase attribution. This proposal establishes no speed, coverage, reverse-sync or executable-admission gain. Root owns native/CST qualification, the complete receiving run, and any later actual whole-project trial under unchanged resource limits.
