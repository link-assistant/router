---
bump: minor
---

### Added

- Discover z.ai Coding Plan models from its authenticated non-inference catalog and merge exact vendor records into every authorized client catalog.
- Expose and enforce explicit `supported_clients` compatibility for ordinary API providers.

### Fixed

- Preserve healthy subscription catalogs when providers are added at runtime, fail explicitly on exact model-ID collisions, and reject incompatible direct requests before upstream dispatch.
