The explicit native retained owned-field path is a source proposal. The prior
retained complete generation exhausted its unchanged JavaScript heap while
retaining the first project's fields; its native stack contained string
flattening and substring work. An unretained field-storage run also exhausted
the heap later in generation. This proposal has no full-project speed, memory
or coverage result. It does
not qualify another full application run before modest codec and receiving
checks establish that the new storage path works within the existing bounds.

`prepare-native-output-text-retention.mjs` copies the complete actual
`private-output-text.mjs`. Installed native TypeScript 5.9.3 selects exactly the
`encode(source,start,end)` and `decode(packed,units)` function declarations and
their bodies. The language phase changes only these two bodies. The repository
phase introduces the explicitly trusted Buffer/zlib DATA imports and their
captured host-operation guards. No original declaration is renamed or removed.
Both phases retain the complete original/intermediate/final source, serialized
and reparsed CSTs, actual edit spans and full inverses. Two detached native AST
copies and a native binding check accompany every complete output source.

The new encoder receives the original at-most-65,536-code-unit chunk, copies it
to bounded UTF16LE bytes, deflates at level one and produces a primitive base64
string. If the fast deflater exceeds the existing packet bound, the encoder
uses level-zero stored blocks and rechecks that same bound. The original caller
then retains its raw-storage fallback for incompressible values. Decode requires
canonical base64, inflates with `maxOutputLength` equal
to that chunk's requested code units times two (at most 131,072 bytes), and
checks exact byte and code-unit lengths. UTF16LE preserves every code unit,
including unpaired surrogates; no UTF8 replacement is introduced. Every encode
still passes through the original independent decoder/string roundtrip before
the caller can retain it.

The original `detached`, `retain`, `restore`, `observation`, private map/store,
collection capture and module-birth bodies remain byte-identical. The original
16,384-unit threshold, 65,536-unit chunks and 134,217,728 stored-string-unit
budget remain exact source constants. Base64's actual primitive character
count flows into the original budget, with no conversion discount. Expanded
chunks still use the existing scalar detached raw fallback; a whole value with
no net storage reduction is returned as its original primitive string. This
means incompressible inputs can still take the original scalar fallback cost.

Buffer/zlib are explicit trusted stock host DATA infrastructure at module birth,
as in the separate existing byte/project-storage contracts. Captured callable
and descriptor fences detect later changes to the directly used Buffer/zlib
operations, their relevant public encoding helpers and direct guard intrinsics.
They inspect descriptors without invoking replacement getters. Existing private
collection guards/captured methods are retained. This is not an arbitrary
hostile-host attestation, permission to trust a cold modified native host, or
equivalence to the original compression sizes or Map/WeakMap observations.
Changing compression can change a packed/raw observation and the exact budget
fallback point. Full restored output strings and all application refusals must
still compare exactly. No source/owner/type/execution authority is granted.

The full UTF16 regression exposed a Bun 1.4.3 difference: level-one raw DEFLATE
expanded 131,072 bytes to 138,242 bytes, exceeding the unchanged 132,096-byte
packet bound. This local reproduction retains the complete input construction:

```js
import {Buffer} from 'node:buffer';
import zlib from 'node:zlib';
let source='';
for(let unit=0;unit<65536;unit++)source+=String.fromCharCode(unit);
const raw=Buffer.from(source,'utf16le');
console.log(raw.length,zlib.deflateRawSync(raw,{level:1}).length);
```

The bounded stored-block fallback addresses that observed expansion without
changing chunk, storage, test or monitor limits. Numeric helpers use captured
functions; replacing global `Number` or `Math` with getter-bearing objects
does not execute those getters. Complete native edit inverses remain separate
from whole-phase CST transport, preserving trivia at inserted-source joins.

The producer first invokes the actual original `prepareOwnedFieldBulkSources`
and freshly compares all nine complete physical outputs to their original
source equations. It then copies only the required retained consumer closure:

- `private-native-output-text.mjs`
- `native-retained-owned-field-bulk.mjs`
- `native-retained-owned-field-matrix-bulk.mjs`
- `isolated-native-retained-owned-field-matrix-bulk.mjs`
- `native-owned-field-isolated-matrix-session.mjs`
- `native-owned-field-isolated-matrix-profile.mjs`
- `scripts/translate-router-native-owned-field-meta.mjs`

Consumer bodies remain intact. Native-selected string literals route imports,
planner admission and worker URLs to the new family. The isolated session and
profile accept exactly their new retained planner, with every original source,
Cargo, staging, timeout, process, output-path and complete-plan check retained.
The separate CLI requires `--retain-output-text`; it refuses the unrelated
`--owned-core-definitions` branch rather than implying that branch consumes the
new codec. All ordinary/default/old retained CLIs and APIs stay unchanged.

Root must first integrate the authored producer/templates/tests and have the
original nine field outputs materialized and fresh. The worker copied no
generated file. Under the existing sole-heavy lease and 2048 MiB heap, 3 GiB
aggregate RSS, 384 MiB complete evidence, disk start/reserve and time bounds:

```sh
node tools/translation/prepare-native-output-text-retention.mjs --emit FRESH_EXTERNAL_DIRECTORY
```

Read the complete gzip plan independently, reproduce both phase inverses and
all native binding/AST equations, and rejoin every physical prerequisite before
installing only the seven actual `.after` outputs through Root's reviewed
materializer. No arbitrary writer or source-restoration callback is exposed.
Then require:

```sh
node tools/translation/prepare-native-output-text-retention.mjs --check
```

Run the complete seven-case `native-output-text-retention.test.mjs` in Node and
Bun under the original 60-second case bounds. Retain its full evidence through
`ROUTER_NATIVE_OUTPUT_TEXT_EVIDENCE_DIR` inside the owned monitored output. It
covers all 65,536 UTF16 code units, lone surrogates/chunk boundaries, repeated
JSON and incompressible inputs, threshold/private-token behavior, a distinct
small-budget test-only source copy, malformed decode and host mutations,
complete same-physical-root ordinary/retained/native plans with every output
byte and implementation hash, and canonical/profile CLI write/check workloads.
The smaller-budget source copy retains the full unchanged installed constant
and both complete source/CST/inverse equations. It is not a changed default or
evidence that the full 134,217,728-unit budget workload was executed.

Only after the modest codec and whole receiving files pass should Root measure
the explicit canonical/profile commands on bounded inputs:

```sh
node scripts/translate-router-native-owned-field-meta.mjs --retain-output-text --root ROOT
node scripts/translate-router-native-owned-field-meta.mjs --retain-output-text --check --root ROOT
node scripts/translate-router-native-owned-field-meta.mjs --retain-output-text --profile-matrix --root ROOT
node scripts/translate-router-native-owned-field-meta.mjs --retain-output-text --profile-matrix --check --root ROOT
```

Keep the original seven local/eight CI stage requirements and full same-SHA
generation, parity and strict-target checks. Existing Rust checks stay gated by
the complete JavaScript gate; there is no local Rust task. Native materialization
and full source inverses have passed. Node/Bun qualification for the revised
codec and full-project generation remain separate required checks. No
application coverage gain or release-ready
freshness claim follows from preserved source or compressed storage.
