### Changed

- Added a private-parser host guard that evaluates the same ingress, static-source and data-freeze conditions with one fresh shared namespace traversal. Both numeric scans, distinct freeze pins and all original public guard bodies remain unchanged; no verdict is retained between calls.
- The private executor and independent SHA helper use the combined guard at their existing checkpoints. Every native hash, filesystem read, independent source digest, decode and final source association remains required. Updated only the derived common/SHA host-source pins and manifest digest.
- Added eight whole-file controls for healthy output, independent static/data failures, namespace descriptors, earliest ingress, ancestry/numeric slots and real hash/read observers installing late hooks. Source reviewed only; receiving tests and any performance improvement remain unqualified. No public parser class, owner or executable authority is added.
