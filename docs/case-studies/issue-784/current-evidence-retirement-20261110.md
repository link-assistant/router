# Current evidence storage custody

The repair batch for [PR #785](https://github.com/link-assistant/router/pull/785)
retired only identified inactive task artifacts after checking their complete
recoverable bytes. This storage change supplies no compiler, parity or gate
authority.

The [current-input retirement receipt](evidence/current-inputs-duplicate-retirement.json.gz)
and its [completion receipt](evidence/current-inputs-duplicate-retirement-complete.json.gz)
record 72 closed raw duplicates: 7,620,496 logical bytes and 7,786,496 allocated
bytes reclaimed. Every member was reopened and checked against the complete
packet committed at `de310d1ee7602d5663bc347a2a28bece21f3c58f`, which remains in
the current tree. Original source inputs remain present.

The [published-archive receipt](evidence/current-published-archive-retirement-20261110.json.gz)
and its [completion receipt](evidence/current-published-archive-retirement-complete-20261110.json.gz)
record 15 archive working copies: 49,474,858 logical bytes and 49,508,352 allocated
bytes reclaimed. Their full bytes were checked against Git blobs and GitHub
metadata at published commit `9b6c9192c70f1f9309eac0c516b59102ce080409` before
removal. The affected reports now link directly to those immutable published
copies; their complete failed and passed evidence remains recoverable in Git
history.

The [nested-archive receipt](evidence/current-published-nested-retirement-20261110.json.gz)
and its [completion receipt](evidence/current-published-nested-retirement-complete-20261110.json.gz)
cover three additional inactive archives under evidence subdirectories. The same
complete published-byte, GitHub metadata, ownership, descriptor and mapping
checks reclaimed 13,244,018 logical bytes and 13,250,560 allocated bytes. Their
immutable published copies remain available at the same `9b6c9192c` commit.

Both procedures required regular task-owned files with one hard link, checked
open descriptors and mappings, and rechecked physical identity immediately
before unlinking. The scripts and complete per-file receipts retain the exact
finite removal sets. They did not remove another process's active artifacts or
authorize a Rust invocation. The measured evidence allocation after these
retirements and subsequent small CI downloads was 448,058,313 bytes, excluding
the pre-existing local toolchain, below the fixed 500,000,000-byte cap.
