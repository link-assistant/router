# Published evidence storage

Five inactive local evidence archives were removed after verifying their complete
published Git blobs at `e88183bb894b9ea62c9d6ae170c3fc099047685b`. Their exact
original compressed streams remain in that immutable published revision. The
four receiving reports now link directly to those original streams. Delivery
continues in [PR #785](https://github.com/link-assistant/router/pull/785).

The operation reclaimed **35,716,732 logical bytes**. Each original receipt,
full-byte SHA-256, GitHub contents metadata and Git blob were checked before
removal. Own-file identity, single-link status and process descriptor/mapping
checks preceded each unlink. No Rust build directory or another task's storage
was removed.

The five individual `*-local-retirement.json.gz` receipts deliberately retain
their pre-unlink `localArchiveRetired: false` observation. The separate
[completion receipt](evidence/five-published-archive-retirement-completion-20261110.json.gz)
records every original receipt identity, all five paths absent after unlink,
the exact executed script and its complete output. The original receipts were
not rewritten to conceal that observation order.

This storage operation preserves complete historical evidence; it establishes
no source authority, parity, performance improvement or green gate. Current CI,
generation and the remaining issue requirements remain unfinished.
