---
bump: patch
---

### Fixed
- The `Publish attested binaries` release matrix now sets a deadline per platform. The Darwin legs get 90 minutes, and the Linux legs keep 30. The fat-LTO release build of the three binaries takes about 8 minutes on Linux and 20-37 minutes on the 3-vCPU `macos-26` runner. On v1.25.3 both Darwin legs were cancelled at the old shared 30-minute limit while still in `Build release binaries`, which blocked provenance verification and npm/PyPI publication (issue #803).
