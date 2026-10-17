### Changed

- Retain the compressed-adoption test's complete evidence using the existing `writeJsonTextGzip` helper. Keep the captured `nativeJson` expression and its replacer exactly once, before path construction, while removing the large trailing-newline string copy. The helper stores the full encoded payload and a separate newline gzip member; decoded bytes remain the contract, not raw gzip identity.
- Preserve all eight original case callbacks, titles, 60-second case limits, 20-second strict TypeScript and cold-child limits, and native hash work. Compression remains inside the original case deadline. No production, serializer, cache or resource-limit change is included.

### Validation

- Source-only: complete originals, two unique substitutions and full UTF-16 forward/inverse proof retained. These changed tests were not run in the authoring worktree. The helper and its seven complete regressions are unchanged and were qualified separately.
- The previous standard Bun compressed-packet run remains aggregate-memory RED under the original 3 GiB bound, despite its final source and evidence guards passing. Earlier resource and semantic failures remain preserved. Reduced transient allocation is an unmeasured source hypothesis; current application coverage, performance acceptance and full-gate publication readiness are not established. No local Rust tool or test engine was run.
