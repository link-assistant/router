### Changed

- Preserve 439 complete translator evidence files, including failed attempts, full input vectors, tested implementation snapshots and original-source comparisons, in a lossless archive. Every decoded member's length and SHA256 is verified. The archive preserves 325,255,361 original bytes within the unchanged 500 MB evidence budget.
- Regenerate the native reverse translation manifest with the integrated translator. It records 55 translated members out of 788 and 733 explicit refusals; all 59 native TypeScript modules and generated Rust remain byte-identical. No Rust build ran. Whole-corpus generation, strict parity and the complete JavaScript gate remain outstanding.
