---
bump: patch
---

### Fixed
- Generate release SBOMs under the filename consumed by packaging, persist OCI attestation metadata without warnings, and avoid download-artifact's known Node deprecation warning.
- Treat every non-documentation build input as code, build and verify the embedded admin UI in CI, and prevent release-capable workflow runs from being cancelled midway.
- Split the admin UI vendor bundle so production builds remain below Vite's chunk-warning threshold.
- Exclude archived development evidence from source-file size enforcement.
- Configure Git's default branch in standalone release reconciliation so checkout stays warning-free.
