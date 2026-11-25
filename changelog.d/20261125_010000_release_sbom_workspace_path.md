---
bump: patch
---

### Fixed
- Release artifact jobs now generate the CycloneDX SBOM with `--manifest-path rust/Cargo.toml` and read it from `rust/link-assistant-router.cdx.json`. The repository root is a virtual workspace, and cargo-cyclonedx writes each SBOM beside its member's `Cargo.toml`, so the old root-level `mv` failed and blocked binary, npm and PyPI publication (issue #801).
