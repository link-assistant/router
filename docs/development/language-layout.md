# Language source trees

The repository has real language directories:

```text
js/                   JavaScript package and native tests
  src/                native JavaScript implementation and CLI
ts/                   generated TypeScript package
  src/                TypeScript generated from the JavaScript source
rust/                 Rust crate, tests, examples, benches and fuzz targets
  Cargo.toml          package metadata and crate targets
  src/                Rust implementation and owned compatibility core
Cargo.toml            workspace selecting rust/
Cargo.lock            shared workspace lockfile
tools/translation/    reusable language rules, repository rules and CST/meta
```

The language directories are physical directories. Source moves use rename
operations; they do not duplicate the source trees or use compatibility
symlinks. JavaScript dependency installation remains shared with the TypeScript
checker. The existing package entry points and the `./native` public export
remain available; the native implementation is in `js/src`.

## Develop and regenerate

Install dependencies with `npm ci --prefix js --ignore-scripts`. Run native
JavaScript checks with `npm run native:test --prefix js` and
`npm run native:test:bun --prefix js`. The native command is
`node js/src/cli.mjs version --json`.

Generate `ts/src` with `node scripts/regenerate-native-typescript.mjs`, then run
its `--check` form and `node scripts/check-native-typescript.mjs`. This producer
retains the serialized/reparsed concrete and semantic syntax boundaries and
checks runtime AST identity after erasing TypeScript types. Generated files
belong to the producer; do not maintain a second handwritten implementation.

The forward and reverse commands remain at repository root:

```sh
node scripts/translate-router.mjs --retain-output-text --owned-core-definitions
node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix
node scripts/regenerate-js-first.mjs --owned-core-definitions --write
node scripts/regenerate-js-first.mjs --owned-core-definitions --profile-matrix --write
```

Forward production discovery uses `rust/src/lib.rs` and `rust/src/main.rs`.
Source inventories retain repository-relative physical paths. Generic receiving
fixtures may still have a root Cargo package; the layout resolver supports both
forms without treating a workspace manifest as the Router package. Existing
crate-relative witness APIs resolve their physical Rust inputs explicitly.

Language substitutions and repository formatting/binding substitutions remain
separate ordered sequences. Both translation directions must cross the checked,
serialized and reparsed CST/meta boundary. Unknown constructs stay explicit
refusals; source preservation and declaration copies do not establish complete
executable application coverage.

## Rust resources and CI

The root workspace retains normal CI Cargo target paths. Rust compilation and
all Rust tools remain prohibited locally for issue #759. Every Rust CI job still
requires all mandatory JavaScript stages to pass for the same SHA.

The shared license, schema, OpenAPI, UI and provider-evidence assets are copied into the
Rust crate by `node scripts/sync-rust-assets.mjs --write`. Its `--check` mode
compares complete bytes and rejects unexpected managed assets. JavaScript lint
CI and the full local gate require this check. Rust production embedding uses
crate-local assets; asset synchronization does not compile Rust. Contract
sources are regenerated with `scripts/generate-contracts.py --catalog js/catalog.json`.

## Current qualification

The local layout draft passed strict compilation of all 164 native TypeScript
files with TypeScript 5.9.3. Complete native core files passed 25 cases under
both Node and Bun. The new nested Rust layout and existing source-corpus files
passed nine cases under each engine, including independently strict-compiled
TypeScript and executable JavaScript output from `rust/src` fixtures. All 30
JavaScript-first workflow/local-gate controls passed under Node. The complete
eight-case enclosing-namespace translator file passed under Node and Bun,
including its strict 20-second TypeScript child and cold source checks. All 12 complete synchronization cases also passed under each engine against the committed physical layout, preserving authored Rust inputs while regenerating checked meta, Rust projections and executable strict TypeScript.

These focused results do not establish full Router translation or a green
complete gate. Source-bank and compiler-export refresh, full canonical/profile
outputs, independent reverse regeneration, the original producer deadlines and
strict parity remain open. See [the continuation ledger](issue-759-continuation.md).

Historical capture receipts retain their complete original bytes and paths.
The old forward/reverse bulk inventories remain explicitly stale until their
actual producers run on the committed layout; replacing path strings cannot
refresh a source hash or establish successful translation. Cargo dependency
profile metadata is refreshed separately by
`scripts/refresh-cargo-layout-profiles.py --check`, using a retained full source
baseline, a complete manifest substitution equation, unchanged dependencies
and lockfile, and identical workspace build profiles.
