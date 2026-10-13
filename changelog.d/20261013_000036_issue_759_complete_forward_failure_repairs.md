### Fixed

- Remove the primitive Copy source route import cycle by using the existing parser-independent token engine, retaining all original opaque type captures and private expansion lineage checks.
- Export the complete production compiler fingerprint closure, including reverse compiler modules, so a relocated translator preserves every implementation hash. Keep all source byte/index/path guards and unchanged finite export bounds.
- Preserve the original Clone/Debug/Serialize assertion source as a newly supported bang-only case and retain every residual/generic/custom-owner refusal. Accept the earlier source-mutation refusal for forged method metadata without weakening accessor or private-seal protections.
