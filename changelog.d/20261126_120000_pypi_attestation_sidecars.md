---
bump: patch
---

### Fixed
- The PyPI release verifier now also rejects any extra local distribution in `dist/`, such as a second wheel, another version or a `.zip`, because the publish action uploads every distribution there. It still ignores `.publish.attestation` sidecars, and the regression tests drive the verifier's command line exactly as the release workflow runs it (issue #806).
