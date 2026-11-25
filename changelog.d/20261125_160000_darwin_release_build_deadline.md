---
bump: patch
---

### Fixed
- The `Publish attested binaries` release matrix now sets a deadline per platform. The Darwin legs get 75 minutes, and the Linux legs keep 30. On macOS the fat-LTO release build of the three binaries takes roughly three times as long as on Linux. On v1.25.3 both Darwin legs were cancelled at the old shared 30-minute limit while still in `Build release binaries`, which blocked provenance verification and npm/PyPI publication (issue #803).
