---
bump: patch
---

### Changed
- Record the explicitly requested issue #759 checkpoint rollover and remaining full-generation, synchronization, parity and CI obligations.
- Continue with the coordinator as the sole worker and publisher after all existing assignments finish; preserve the no-local-Rust and same-SHA JavaScript-first CI requirements.
