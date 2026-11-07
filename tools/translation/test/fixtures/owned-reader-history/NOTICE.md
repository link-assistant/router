# Complete owned reader history

Router source retains its repository license. This archive contains the complete
four selected reader equations and the host declaration equation emitted by the existing ASCII and runtime-import
source producers at `94367657f8086dfb23d0d43f6584f15eb4a42346`, including their
native source copies, both CST phases and complete inverses. No old fixture or
producer pin was replaced.

Reproduce with Node 20.20.2 and lockfile TypeScript 5.9.3:

```
node experiments/issue-784/capture-owned-reader-history.mjs FRESH_OUTPUT.json.gz
node experiments/issue-784/capture-host-asset-history.mjs FRESH_HOST_OUTPUT.json.gz
```

The capture executes the unchanged complete producer chain, including the
original native compiler callable-source checks. Bun rewrites that installed
CommonJS source and correctly fails those checks. Receiving this frozen DATA in
Bun does not reissue its runtime compiler profile. The receiving helper checks
every complete archived source, reparses both CST phases, executes their complete
substitutions and inverses, and independently compares native AST source copies.
The current reader must equal the entire last afterimage. Changed complete source
or archive bytes refuse. Historical source comparison grants no semantic,
ownership, executable or runtime-parity authority.

The original named-host Git fixture and all original assertions and deadlines
remain required. This fixture does not certify full compiler generation.
