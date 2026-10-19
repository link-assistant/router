### Changed

- Regenerate all native TypeScript drafts and the reverse translation census with the combined compiler, retaining unsupported declarations and reducing explicit dynamic types for checked Map/Set containers.
- Keep null and undefined distinct through meta, TypeScript and Rust draft tags, and lower four additional original guarded JavaScript functions.
- Give the complete native regeneration drift test a finite 60-second budget and launch Node-specific fixture checks through Node when Bun hosts the test suite. Both engines retain the full compiled runtime fixture checks; no Rust build is performed.
