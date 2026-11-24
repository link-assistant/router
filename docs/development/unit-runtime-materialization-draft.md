# Source-unit runtime materialization draft

These implementation and independent regression sources are unverified. Do not
run the following commands until the entire requirement set is bulk drafted.
No runtime has been materialized, no test or translator experiment has run,
and no Rust tool has been invoked during this source-only phase.

The source-unit CLI now drafts runtime assets separately from application
translation. A receiving repository can use its explicit source-unit descriptor
to obtain a complete plan for both physical JS/TS runtime roots:

```sh
node scripts/sync-router-units.mjs --root RECEIVING_ROOT --manifest units.json --runtime-only --plan runtime-plan.json
node scripts/sync-router-units.mjs --root RECEIVING_ROOT --manifest units.json --runtime-only --apply runtime-plan.json
```

The initializer derives the complete registered runtime/declaration/license
asset set. It captures all existing target bytes and original source,
dependency, native-input, metadata and descriptor paths. It refuses overlaps,
linked paths and changed original inputs. Apply freshly recomputes the complete
proposal and uses the existing full transaction, ordinary-file checks, atomic
replacement, mode preservation, readback and rollback behavior. Each previous
artifact remains in its complete source inverse. The existing 64 MiB complete
proposal, 8 MiB file, 192 MiB serialization and worker resource limits remain.

This copies runtime artifacts. It does not translate the application, execute
Rust, install dependencies, qualify a receiving compiler, establish parity or
unlock any CI stage. The subsequent actual source context must independently
join physical native/Cargo/runtime sources before checking a caller. The
ordinary `--plan`/`--apply` source synchronization path keeps its original entry.

`unit-runtime-materialization.mjs` is a complete derived copy of the existing
source transaction module. Its full original is retained in the source-profile
directory. Ordered native-selected substitutions share the actual original
installer only inside that separate module and add the artifact producer.
`prepare-unit-runtime-materialization.mjs` retains both complete original files,
exact recipes, actual native owners and serialized/reparsed CST inverses. The
original source synchronizer stays intact. The existing exported compiler tree
and CLI entry include these new dependencies; receiving qualification remains
required after bulk drafting.

Unrun independent source covers physical runtime execution, source preservation,
complete licenses/declarations, unchanged reruns, forged and stale plans,
existing artifact modes/inverses, symlinks, source overlap and CLI mode parsing.
All other open requirements and the complete same-SHA JavaScript-first gate
remain unchanged.
