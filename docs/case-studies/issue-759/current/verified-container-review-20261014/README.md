# Complete container and translation verification evidence

`complete-evidence.tar.xz` and `supplement-complete.tar.xz` retain 1,423 complete originals totaling 744,670,734 decoded bytes. Their capture receipts pin every original path, length and SHA256; every member was reopened and verified. They include passed and failed runs, source variants, complete translation outputs and resource observations. Storage does not certify runtime parity or a successful JavaScript gate.

The earlier `raw/current-task/source-variants-batch-v3/complete-evidence.tar.xz` is preserved as its exact reachable Git blob through `../../packet-git-index.json`. Its original capture and installation receipts remain unchanged. Recover and verify all 4,853 complete members using the [packet reader](../../../../../tools/evidence/README.md). Original compressed bytes are recovered without recompression. A complete local Git history containing the declared ancestor is required.

`complete-install-records.tar.xz` retains the complete migration harness, before/after reports and raw command streams, the worker's reader verification receipt and its complete referenced reports, plus exact source snapshots. Its separate capture receipt verifies all selected originals. Three complete CI integrity scans passed; complete same-root measurement JSON is byte-identical before removal, after Git fallback and after installation. The independent overlay comparison preserves its declared path differences separately.

The physical case allocation stayed below the fixed 500,000,000-byte cap. Retiring a physical case archive does not establish volume space reclamation: Git and task-owned hardlinks may retain its bytes. No Rust build or publication occurred, and full runtime parity remains unproved.
