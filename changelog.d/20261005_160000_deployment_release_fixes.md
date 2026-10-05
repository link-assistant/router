### Fixed
- Preserve deployment config ports when global CLI defaults are propagated, expand home-relative deployment roots, and refuse a host listener mismatch without planning a second process on the same data directory (#688).
- Release deployment lifecycle locks explicitly when an operation finishes, including when an unrelated child briefly inherits a descriptor, so a completed operation cannot block the next retry (#689).
- Build Docker dependency caches for every declared Cargo target and build the amd64 runtime on pull requests. Check default deployment image availability before planning, with a named unpublished-version error and an explicit image remedy (#687).
- Keep GitHub releases as prereleases until binaries, both container architectures, both registry manifests and provenance checks succeed; publish crates.io and promote stable/latest only after that gate. Prepare the next patch release to restore complete container delivery (#687, #689).
