Run `node scripts/sync-router.mjs --write` to generate the current JavaScript → meta → Rust and TypeScript drafts, then the complete Rust → meta → JavaScript and TypeScript corpus, platform matrix and original serialization descriptors. Every producer runs sequentially with its existing finite execution budget. No Rust compiler runs.

Use `--check` for the same complete producer sequence in freshness mode. `--direction javascript-to-rust` or `--direction rust-to-javascript` selects a direction; `--canonical-only` omits the separate platform matrix from this convenience command. These options do not alter the mandatory CI checks. Both modes require an explicit flag.

The command compares every original tracked or untracked Rust/Cargo and native JavaScript input before and after the sequence. Sparse tracked inputs are read from their exact HEAD blobs. Only the exact generated outputs `src/generated_js_first/policy.rs`, `src/generated_js_first/mod.rs` and `packages/javascript/native/affinity-schema-descriptor.mjs` are excluded from original-input preservation. Other files in those directories remain protected, including the handwritten native schema interpreter. A failed producer prevents dependent producers from using stale outputs, records the remaining stages as unrun, and returns a failure.

In `both` mode the full reverse producer runs once to establish its generated Rust inputs, followed by the affinity descriptor, then the full reverse producer again and native TypeScript. The affinity descriptor is a native input to those two final producers; its source metadata also binds the generated Rust inputs. This cheap duplicate reverse pass avoids leaving either dependency stale. Canonical forward generation and the optional platform matrix each run once, followed by the serialization registry. A Rust-to-JavaScript run also produces the affinity descriptor before forward generation. These steps preserve the descriptor's existing independent native-baseline comparison: changed runtime layouts still refuse instead of silently replacing that baseline.

A JavaScript-to-Rust receiving project without affinity inputs keeps its original two producers. If the native affinity source, descriptor or a static relative import of that descriptor is present, the command first prepares generated Rust, checks the descriptor, then runs the final reverse and TypeScript producers. That partial direction never repairs the descriptor; stale or missing prerequisites fail with their full diagnostic. A write prepass can update its generated projections before that failure; the receipt retains the completed prepass and marks final producers unrun. Use `both` to regenerate those prerequisites. Check mode keeps every pass in check mode and never repairs stale outputs. Owned descriptor files still require regular files and unlinked ancestors, and native dependency discovery retains the original 32 MiB file, 256 MiB total and 32,768-path bounds.

Complete raw stdout/stderr, command, deadline, status and input vectors are retained in a new receipt directory. Child streams write directly to exclusive files and their hashes are computed by bounded streaming reads, so output above the former 8 MiB in-memory buffer remains complete. Producer deadlines are unchanged. Set `--output NEW_DIRECTORY` to choose it; the default is a fresh temporary directory. Existing receipt directories and raw log files are never overwritten. `runSynchronizationProducer` also exposes the same runner for bounded individual producer diagnostics; a passing individual record does not certify the complete synchronization sequence.

This command automates the existing draft translators. Their retained refusals, dynamic TypeScript annotations and uncompiled Rust projections still block whole-source synchronization and runtime parity. A passing freshness receipt cannot unlock Rust CI or replace the complete JavaScript gate. Continue implementing and testing refused constructs before promoting their coverage.

## Explicit owned-core reverse profile

Default reverse regeneration also inventories the actual forward application
modules under `packages/javascript/generated/rust-project`, their materialized
runtime closure and the matching TypeScript declarations. It retains complete
receiving inputs and an independent per-function refusal inventory in
`parity/js-owned-core-reverse-draft.json`. An absent corpus is reported as
unavailable; zero admitted functions is not successful application coverage.
The original portable, native and unsupported workloads still run.

`translateOwnedCoreJavaScript`, `translateOwnedCoreConcreteSyntaxMeta` and
`parseOwnedCoreMeta` form a separate `router-owned-core-reverse-v1` contract.
They require a freshly constructed `createOwnedCoreSourceContext` with complete
files, `runtimeRoot` and `declarationRoot`. Actual source import symbols, the
complete registered runtime, the public Rust facade edge and full owned leaf
must join before a call is checked. Written source types declare an input
domain; names, copied flags and structural JSON shapes grant no call authority.
Concrete syntax is serialized/reparsed before native parsing. Both targets use
serialized/reparsed semantic Links and reconstruct every original function.

The first source draft supports immutable straight-line and closed branch uses
of copy, update and the explicit string/usize/map index APIs. Rust evaluates all
arguments into temporaries before compensating copies, preserving reusable JS
inputs. Borrowed index results must originate from a live input root. Canonical
JSON inputs use the existing 4096-node/depth-32 domain; native Rust needs the
emitted matching copy/update guards. No JSON reference identity, reflection,
custom coercion, mutable aliases, callbacks, unknown helper calls or error
identity/stack/catch observation is admitted. This is a bounded successful
resource/value contract; native panics are not catchable JavaScript TypeErrors.
Index `bigint` inputs need the actual registered parameter type, not an
unconstrained numeric spelling; the emitted usize conversion remains checked.

The 479 optional parse operations remain reverse-refused until their full
1 MiB, lexical digit, depth, UTF-8 and locked numeric-profile behavior has a
matching reverse implementation. Collection callbacks are a later lane.
Source drafting, focused JS/strict TS receiving, native CI and complete
synchronization freshness are separate obligations. This source checkpoint
claims none of those unrun checks and does not relax any old deadline.

The actual regenerator also emits a separately counted CI receiving witness
from the complete JS source embedded in the authored Rust oracle. It retains
its original source, one reversible comment prefix, staged canonical receiving
interface, actual library inputs, CST, checked Links, Rust and TypeScript plus
the complete materialized runtime. The native oracle includes that actual
producer-owned Rust file and aliases the genuine library core. Root must run
and install the reviewed producer outputs before CI; no worker hand-authors the
included file. Witness cases do not increase application coverage counts.
