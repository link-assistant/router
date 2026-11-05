# Reusable owned-core proposal and review CLI draft

All code and cases in this batch are drafted and unrun. No CLI, worker,
exporter, translator, preparer, test, experiment, diagnostic, regeneration,
Rust tool, push or CI has run for this draft. Every unfinished requirement in
[the bulk ledger](bulk-draft-requirements.md) remains open.

The new CLI copies the complete existing source-unit worker controller. It
retains the cold Node worker, 1,792 MiB heap cap, 120-second worker deadline,
8 MiB output cap, Bun-to-Node route, actual receiving working directory,
source-root environment, child failure handling and small JSON receipt.
Only argument selection and the proposal/readback operations change. The
original source-unit CLI retains its APIs and implementation.

After the full source draft is complete, the intended receiving commands are:

```sh
node scripts/router-owned-core-stages.mjs --mode propose --root ROOT --output NEW_DIRECTORY --stages text-methods,primitive-option-methods,integer-methods,primitives
node scripts/router-owned-core-stages.mjs --mode review --root ROOT --output NEW_DIRECTORY
```

The default source root is the current working directory. Proposal stages must
be explicit, nonempty and unique. Review takes its stage sequence from complete
retained packets. Unknown/repeated flags and review-time stage overrides refuse.
The actual worker APIs keep their fixed known operation selection. Proposals
write bounded complete gzip evidence to a new outside directory. Review rejoins
all current source/Cargo inputs and full fresh original proposer results.
Neither mode installs application source, runs Rust or grants executable parity.

The canonical translator entrypoint list includes this CLI, so the complete
partitioned exporter retains its script, dependencies, rule/source profiles and
licenses under the unchanged file/byte/receiving bounds. Independent unrun source
covers CLI refusals and complete cold proposal/readback from an exported compiler
in a separate receiving working directory. Three full originals retain ordered
language/repository substitutions, native owners, whole CSTs and exact inverses.
Actual receiving/export qualification, broader translation/effects, production
adoption/parity and all original CI/freshness obligations remain unfinished.
