# Bulk translation in a fresh compiler process

`tools/translation/isolated-project-batch.mjs` runs one registered original
compiler in a fresh process for each explicit source batch. Its canonical ESM
entry captures the supplied source corpus, plans the translations and applies
that plan inside the child. The existing CST and checked semantic meta-language
boundaries remain part of the actual compiler operation.

```javascript
import {translateOriginalProjectBatch} from './tools/translation/isolated-project-batch.mjs';

const result = await translateOriginalProjectBatch(JSON.stringify({
  schema: 'original-project-child-request-v1',
  sourceFiles: [{path: 'src/lib.rs', source: 'pub fn answer()->u8{7}'}],
  entries: ['src/lib.rs'],
}));

for (const {path, text, sha256} of result.artifacts) {
  // Review complete detached artifact text before installing it.
  console.log(path, text.length, sha256);
}
```

The primitive JSON request must use only the shown fields and roundtrip exactly
through `JSON.parse` and `JSON.stringify`. Source paths are relative `.rs` paths, with
optional root `Cargo.toml` and `Cargo.lock` data. Limits are 1,024 files, eight
Rust entries, 2 MiB per source file, 16 MiB total source bytes and 32 MiB request
bytes. Source text must roundtrip as UTF-8; unpaired UTF-16 surrogates refuse.

The child uses `compilationProfile: null`; parent profile or ownership claims
cannot be supplied through the request. It returns artifact text and receipts,
without exposing private parser classes, checking contexts or executable
capabilities. Original unsupported constructs remain unsupported. Process
isolation does not add Rust language coverage or establish runtime parity.

The current registration requires the complete fixed compiler source packet
and installed TypeScript 5.9.3. It includes source profiles, licenses, notices
and package boundaries. Moving the translator to another repository requires
these inputs and complete receiving checks; copying only the entry module is
insufficient. See the registration's NOTICE for its trusted stock process,
POSIX and exclusive task-directory boundaries.

To propose a new compiler registration, run the JavaScript preparation tool
with a full committed source SHA and a fresh destination outside the source
tree:

```sh
node tools/translation/prepare-isolated-project-compiler.mjs \
  --root "$PWD" --revision FULL_SOURCE_SHA --output /tmp/fresh-router-proposal
```

The tool captures complete original Git blobs and installed TypeScript bytes,
then packages deterministic registration data and exact bootstrap pin
substitutions in the separate `language` and `repository` rule sequences.
It retains complete before sources and verifies the inverse substitutions.
Review all proposed registry, parent and driver bytes together; the tool does
not change the live registration or automatically trust the current HEAD.

Run the whole `isolated-project-batch.test.mjs` and `export-bundle.test.mjs`
files under Node and Bun, including independent artifact comparisons, emitted
JavaScript and strict TypeScript execution, failure cleanup and original
deadlines. Registration and focused tests do not establish generated freshness
or replace the complete same-SHA JavaScript gate. Rust runs only in CI after
that gate succeeds.
