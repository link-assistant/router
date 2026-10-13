### Changed

- CI evidence readers resolve complete decoded reports from a shared verified archive while returning exact original compressed containers from immutable reachable Git blobs. Current logical paths and receipt hashes remain intact, with physical allocation reported separately and corrupt indices or archive members refused. This adds storage tooling and bounded integrity tests; it does not apply archive migration or change translation/runtime authority.
