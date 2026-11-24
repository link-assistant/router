# Current descriptor fixture receiving path

- [x] Reproduce from the complete current CI job log on `10fd7f0da82df707f90b16eb892e8e520f699654`: all eight descriptor cases fail in `sourceStage` before behavior checks. Job 128754637443, first failure lines 2293–2315.
- [x] Identify the cause: `private-native-proof-json.mjs` imports its qualified lexing guard from `guarded-proof-lexing-intrinsics.mjs`; the receiving-only repository rule still expects `original-lexing-intrinsics.mjs`.
- [x] Update that one exact repository import substitution. Retain all original source comparison, whole CST serialization/reparse and inverse checks, behavioral inputs, counters, assertions, strict target checks and 60-second case deadlines.
- [x] Finish and reap the active whole owned-generation observation before another resource-intensive command.
- [x] Run the complete eight-case descriptor file under Node 20 and audit the original deadlines; retain failed attempts too.
- [x] Run the complete same file under Bun and record actual tool versions.
- [ ] Review the one-line diff, retain source/log evidence, and commit the coherent fix.
- [x] Collect the published head's complete CI cycle before another push.

This fixture change supplies no source, namespace, ownership or executable authority, and does not qualify missing owned outputs, strict parity, the complete local gate or Rust.

Node 20.20.2: eight passing cases, terminal deadline audit passed with zero breaches and complete child cleanup (146.569 seconds). Bun 1.4.4: eight passing cases (121.38 seconds); the CI Bun 1.4.3 pin is not locally qualified. The published cycle completed at 2026-11-08 15:17:27 UTC; all 25 non-passing job logs are retained. The owned planner stopped at the aggregate memory guard; its buffered progress output is incomplete and grants no generation evidence.
