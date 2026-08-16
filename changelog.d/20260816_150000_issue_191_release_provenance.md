---
bump: patch
---

### Fixed
- Release images now label `org.opencontainers.image.revision` with the commit the release tag resolves to instead of the merge commit that triggered the run, so the published image proves which source it was built from.
- Release checksum files list flat asset names, so `sha256sum -c` works in the directory `gh release download` writes to.

### Added
- Every packaging job checks out the resolved release commit by SHA and fails if the workspace is not that commit.
- `scripts/check-release-provenance.rs` guards published releases after publication — it re-resolves the annotated tag and compares it against both platform manifests in both registries, the checksum files, and the build attestations of the downloadable archives. The scheduled reconciliation workflow re-runs the same guard daily.
