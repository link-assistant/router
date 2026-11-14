# Complete diagnostic payload custody

The [complete custody packet](evidence/current-container-custody.json.gz)
retains all seven storage receipts and streams. Six closed CI metadata files
were compressed with verified full readback, saving 581614 logical bytes.
Exact loose copies already retained in the committed ASCII and string-equality
packets were verified against those whole packets before retirement, saving
657222 logical bytes and 925696 allocated bytes. Active paths were excluded.

Two complete source proposal JSON payloads now use XZ containers. Their full
decoded lengths and SHA256 values were verified before and after writing:
84751668 bytes for the unit/Unicode proposal and 28693627 bytes for runtime
imports. This saves 9230836 logical bytes. Every decoded byte remains retained;
the old outer gzip streams are not retained. Their complete digests and sizes
remain in the custody receipt, including temporary replacement output sizes.

A subsequent compiler-registration proposal exceeded the 500000000-byte task
evidence limit by 469071 bytes. Its complete 7933417-byte JSON payload was
preserved in a 383268-byte XZ container, saving 925173 bytes. The preceding
overrun remains recorded. This third old outer gzip stream is also not retained.
The three complete XZ payloads are tracked at their original `ci-logs` paths;
the packet records each full container identity.

Diagnostic writers now check capacity before creating new output, reject
existing gzip or XZ containers and verify complete decompression readback.
The runtime-import reader accepts either complete container without changing
any source equation or compiler check. The larger unit producer retains its
streaming verification and refuses both existing container forms.

These storage observations establish no executable application gain, parity,
deadline qualification or green gate for [PR #785](https://github.com/link-assistant/router/pull/785).

The separate [published packet retirement receipt](evidence/storage-ci-complete-local-retirement.json.gz)
records full byte verification of one inactive 33132484-byte local archive
against its unchanged published Git blob and authenticated remote metadata.
The entire original compressed stream remains at the receipt's immutable
published URL, retaining all 395 members. Its local allocation was 33132544
bytes. No test result or source-generation state changes.
