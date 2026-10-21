# Opt-in source-backed core sequence packets

The standalone `source-backed-core-sequence-packets.mjs` module proposes and
reviews the complete physical formatting → matches → vectors source sequence.
The existing `scripts/propose-core-adoption.py`,
`scripts/review-core-adoption.py`, json-readers reviewer/equation adapters and
default paths remain unchanged. Their singleton schemas, source obligations and
application checks do not certify this separate sequence.

```sh
node tools/translation/source-backed-core-sequence-packets.mjs propose --root PHYSICAL_ROOT --output OUTSIDE_NEW_DIRECTORY
node tools/translation/source-backed-core-sequence-packets.mjs review --root PHYSICAL_ROOT --output OUTSIDE_EXISTING_DIRECTORY
```

The APIs are `proposeSourceBackedCoreSequencePackets({root,output})` and
`reviewSourceBackedCoreSequencePackets({root,output})`. Both accept only those two
primitive path fields. No caller-supplied verifier, source owner, compilation
profile or alternate rule sequence is accepted. There is no application command.
Keep proposal and review inside the coordinator's existing resource monitors.

The producer calls the actual physical sequence API. Every phase receives the
complete preceding source map and rebuilds genuine graphs/private attribute
inspection and Cargo inputs. Original, inactive and unresolved source bytes stay
in the result. The packet transport retains every original/intermediate/final
CST, per-file inverse, source map, proposal row, inspection and trace. It does not
allocate one complete-result JSON string. Gzip only carries data; it cannot issue
a namespace, parser, type or ownership certificate.

The reviewer decodes every stored packet and regenerates the complete native
proposal from the same fresh physical sources. It compares every full leaf and
its structural position to that actual source equation, then runs the existing
physical/CST/inverse reviewer. This independent invocation reissues genuine
inspection contexts rather than accepting a saved schema as source-rule
permission. Per-leaf comparison avoids holding a second complete detached CST
history alongside the fresh complete proposal. Counts identify distinct original
functions by physical path, module, name, original span and source hash; selections
across phases are not added as executable gains.

The original limits remain: 1024 source files, 32 Mi source code units, 64 MiB per
packet, 1 GiB logical output, 20000 packets and 384 MiB stored output. The external
monitor must also count input snapshots, indexes, logs and temporary files in its
combined 384 MiB evidence cap, enforce 3 GiB aggregate RSS, a 2048 MiB Node heap,
900s production limit, 180s review limit, at least 3 GiB starting disk and a 2 GiB
disk reserve. The library does not replace those process/resource monitors.

This first reusable transport is deliberately separate from the Python guarded
publication/application workflows. A complete production compiler/TypeScript/Git
input freeze and its before/after membership joins remain obligations of that
outer controller; the reviewed v2 production controller supplies them. The new
standalone CLI does not claim that complete compiler capture itself. Its entire
three-stage proposal remains live during generation and fresh review, so resource
qualification is still required. A deadline, heap, RSS or evidence failure stays
incomplete; do not shrink the domain or drop history to obtain a green result.

All receipts keep `semanticAdmission:false`, `executableCoverageGain:null` and
`applicationSourcesInstalled:false`. CST inverse fidelity is not reverse executable
coverage. Fresh whole-project before/after admission, strict targets, the complete
local gate and same-head CI remain outstanding. The new seven-case receiving file
is source-only and unrun at this checkpoint; no local Rust tools were invoked.
