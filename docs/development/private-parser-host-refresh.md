# Propose an append-only private-parser host refresh

The private parser authenticates complete registered provider, host, license and
notice bytes on every source transaction. Appending a helper to a registered
host therefore requires a reviewed manifest change and the corresponding
executor manifest pin. A stale pin must fail; it is not an optional freshness
check.

Use the proposal tool after committing the reviewed append-only host change:

```sh
node tools/translation/refresh-private-parser-host-profile.mjs \
  --root /absolute/path/to/router \
  --baseline FULL_SHA_BEFORE_THE_APPEND \
  --head FULL_CURRENT_SHA \
  --output /private/tmp/new-host-profile-proposal
```

The tool supports the registered `original-json-intrinsics.mjs` host only. It
requires the complete original host prefix, unchanged canonical baseline
manifest and executor, unchanged other registered files, current physical/Git
equality, canonical UTF-8 and stable regular files without linked ancestors.
Its ordered `language` sequence retains the complete source evolution; its
`repository` sequence updates only the registered host pin and the executor's
unique exact manifest-digest literal. Changes to provider bodies, source rules,
host prefixes or the other host file require a separately reviewed extension.

The new directory contains two proposed output files and `proposal.json` with
complete before/after sources, both inverse substitutions, all source joins and
the rule trace. It changes no repository file. Independently replay the full
inverses, compare every unchanged registered input and inspect the exact host
append before installing the two proposed files in a coherent source commit.
Retain the proposal and failed checks.

Historical parser observation tests also pin complete host source closures. Update their
test-data evolution with the full original/current bytes and a checked inverse;
preserve historical graph bytes, case bodies, callbacks and deadlines. Do not
normalize unexpected sources, substitute a saved digest verdict or silently
accept new source bytes. Then run the complete affected Node and Bun files, including
source-mutation refusal controls, with their original limits.

This maintenance proposal grants no parser, type, ownership or executable
authority. Actual source/CST authentication, serialized and reparsed meta,
independent semantic checks, original deadlines, generation freshness and the
complete same-head JavaScript gate remain required. Rust runs in CI only after
every required JavaScript stage passes for that same SHA.
