---
bump: patch
---

### Changed

Separate completed comparison operands from descendant eligibility records in
the private immutable JSON cache. Both weak-map partitions together retain at
most the existing 4,096 positive scalar records. Large child walks no longer
evict every previously checked operand. Logical cell/depth limits, encoded-byte
limits, source checks and fallback behavior remain unchanged. Preserve the full
previous helper and add owner churn/rotation regressions. This optimization does
not establish full translation, runtime parity or a measured performance gain.
