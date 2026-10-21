# Language layout and bounded metadata evidence

`metadata-containers.json` records three historical capture receipts moved to
lossless `.json.gz` containers. Every decoded byte was compared with the complete
original and its committed Git blob before the plain duplicate was retired.
The original logical paths and source commit remain in the record.

The existing [packet reader](../../../../../tools/evidence/README.md) accepts
compressed member receipts through `--members-receipt path.json.gz`. Historical
source records keep their original logical names; the containers preserve their
complete contents. This storage change establishes no translation or parity
result.

[Complete CI feedback](complete-ci-657-feedback.tar.xz) retains all 41 failed
job logs and the complete 132-check rollup for published head
`657169fb8c4ea9dffff292b91ac49a030a49b4cf`. All 88 archive members were reopened
and compared in full, both at capture and installation. The
[capture receipt](complete-ci-657-feedback-capture.json.gz) preserves every
original path, length and hash. All original local sources remain intact.

[Owned UTF-8 storage evidence](complete-owned-utf8-storage.tar.xz) retains 150
complete declared members: source proposals and CST inverses, the first failed
and repaired receiving runs, complete original Node deadline audits, controllers,
and actual compiler-registry/portable-fixture proposals. Every member was
reopened and compared in full. Its
[capture receipt](complete-owned-utf8-storage-capture.json.gz) records the complete
member list. All 22 storage/materialization cases and all 16 refreshed compiler
receiving cases passed under both engines; the eight source-bank Node cases and
strict 164-file native TypeScript check also passed.

The large captured CST used by the separate storage observations remains local
and is explicitly outside this packet. Those observations do not form a standalone
input-complete archive or qualify the live full-project compiler. Full forward,
profile, reverse-owned and parity checks remain open. Installation retained all
earlier packets and stayed within the unchanged 500,000,000-byte case-study cap.
