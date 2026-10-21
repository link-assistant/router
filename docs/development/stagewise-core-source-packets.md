# Stagewise complete core source packets

This explicit proposal/review operation runs formatting, literal matches and
vectors on every complete physical source map, retaining only one materialized
stage proposal at a time. It leaves the existing full-value and packet APIs and
all application sources unchanged. It does not grant executable admission.

Generate the two helper modules from the actual complete current stage driver
and packet implementation before running the new operation:

```sh
node tools/translation/prepare-core-sequence-stream-sources.mjs --write
node tools/translation/prepare-core-sequence-stream-sources.mjs --check
node tools/translation/source-backed-core-sequence-stream.mjs propose --root /physical/repository --output /outside/new-packets --progress
node tools/translation/source-backed-core-sequence-stream.mjs review --root /physical/repository --output /outside/new-packets --progress
```

The producer copies the complete original stage module and native-selected
complete packet helpers using TypeScript 5.9.3. Its language and repository rules
retain full before/intermediate/after CSTs, native binding review and each phase's
source inverse. The generated adapters re-read the actual original template
hashes on every operation and after callbacks. A template change requires a new
native source generation. Hashes and serialized DATA issue no namespace owners.

Each stage calls the unchanged actual corpus adopter with the complete current
map and fresh Cargo inputs, followed by its complete independent graph/source
join. Every original/intermediate/final source has a lossless CST document. Each
full stage input, row, inspection and remaining field is stored in bounded gzip
packets and immediately reopened with exact canonical byte, gzip and digest
checks. Before the next stage, the complete proposal and its decoded CSTs become
unreachable. The retained state consists of original/current primitive source
maps, document/packet descriptors and original function coordinate DATA. Prior
complete rows are reopened individually; only their inverse mappings survive
that read. No private proof or inspection view crosses a stage boundary.

The independent reviewer freshly regenerates and checks one entire stage at a
time against all retained bytes, then releases it. It also checks every source
CST, all document and packet references, exact original function identities,
complete physical source/Cargo/workspace/lock membership and each whole-source
inverse back to the original map. A stored checksum, summary, flag or caller
verifier cannot replace an actual native source equation. The success index is
written last, after all stage EOF, physical-input and packet checks. While the
owned output directory remains intact, a failure retains finite incomplete
packets and a bounded failure receipt, with no success index. Source inverse
fidelity does not establish reverse executable support.

Progress callbacks receive bounded frozen scalar events for document emission,
stage completion and final packet EOF. Callback failure or physical mutation
stops the operation. No child processes or detached work are launched.

The original limits remain: 64 MiB per logical packet, 1 GiB logical output,
20,000 packets and 384 MiB stored output, with the original failure reserve.
Production qualification still requires the coordinator's unchanged 900-second
proposal and 180-second full review bounds, 2048 MiB heap, 3 GiB aggregate RSS,
3 GiB starting free space and 2 GiB reserve. A complete outer compiler/TypeScript
input census must be frozen and rechecked by that controller. This library's
physical snapshot covers its complete Rust source graph and Cargo inputs.

The previous complete 564-source three-stage run stopped at its 900-second bound
before producing a result. The new lifetime removes simultaneous decoded stage
histories; one materialized stage may still exceed the memory limit, and three
fresh namespace passes may still exceed the time limit. No production speed,
coverage or admission improvement is claimed before a complete qualified run.

Seven whole receiving cases cover original native source copies and inverses,
three-stage source history and coordinates, forged/linked/extra packets, fresh
source/workspace/lock changes and added files, callback failure and mutation,
unknown/local/mixed/foreign macro barriers, unchanged limits and explicit CLI
options. This source draft has syntax checks only; generation and all runtime
cases remain unrun until the coordinator grants the shared execution lease.
