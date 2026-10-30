# Flat retained translation output

The explicit retained compiler path has a generated storage variant:

```sh
node tools/translation/prepare-flat-native-output-text-retention.mjs --check
node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --progress
```

Use `--check` for freshness and `--profile-matrix` for the three independent
declared platforms. The explicit contract requires `--retain-output-text` and
refuses `--owned-core-definitions`. The ordinary APIs keep their existing
observer contracts. This path preserves the complete project compiler, source
discovery, semantic refusals, output budgets and original case deadlines.

The producer copies the actual byte detacher into a copy of the complete native
retention closure. Native AST substitutions bind seven references to the
existing guarded Buffer operations. Only the original `detached` body changes;
the remaining storage functions retain their exact bodies. Separate language
and repository sequences serialize and reparse complete CSTs, retain full
inverses, validate native syntax/bindings and generate the complete CLI, matrix,
worker and regression closure. Do not edit generated files by hand.

The actual complete canonical run at `9a57944c677615b7e0984969d8d91ea52a299974`
processed all 862 Rust sources and applied the plan without failures in
1,105.387 seconds, with sampled peak aggregate RSS 2,774,614,016 bytes under
the existing 2 GiB heap and 3 GiB RSS caps. The resulting production census is
157/2,570 executable top-level functions (6.11%); it does not establish full
runtime parity. The CI/local canonical and profile commands and synchronizer
now select this explicit path. Every JavaScript stage still gates fatal Rust
verification for the same SHA. Compiler-input changes require regeneration.

The old per-character detacher exhausted a 96 MiB heap on a deterministic
16 MiB UTF16 input; the flat path preserves every code unit within that heap.
All nine focused cases pass under Node and Bun, including host-mutation
refusals, complete plan/byte equality and canonical/profile CLI checks. This is
a storage qualification. Full-corpus generation, current executable coverage,
strict parity and the complete JavaScript gate remain separate requirements.

The synchronizer excludes exactly its generated ASCII/scalar Rust witness from
the original-input capture. Authored Rust oracles and neighboring files remain
protected. Its regression exercises the actual producer, all seven application
functions plus three emitted helpers, manifest hashes, stale-output refusal and
authored-input mutations. No Rust tool runs locally; Rust checks remain fatal
in CI after every required JavaScript stage passes for the same SHA.
