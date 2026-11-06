# Verification

- Initial head: `83cb0d789e9f875a9e38353ce1a18ebb00a814a3`.
- Pre-fix regression: 1 failure, actual `CF-IPCountry: GB`, expected absent.
  Source: `js/test/native-geolocation.test.mjs`; preserved log in
  `experiments/issue-784/before.log`.
- Final focused files: `native-geolocation`, `native-geolocation-websocket`,
  `native-websocket`, `native-service` and `native-server` tests: **64 passed,
  0 failed** under Node 20.20.2 and Bun 1.4.4. Synthetic localhost upstreams
  capture HTTP bodies/headers and actual fragmented WebSocket traffic.
- Both `npm run typecheck --prefix js` and `npm run native:typecheck --prefix js`
  passed with strictness intact.
- Native TypeScript regenerated with Node 20.20.2, matching CI's Node version.
  Final generation: 11,584,666 source bytes; 7 updated artifacts;
  0 unexpected artifacts. The earlier Node 26.13.0 attempt failed intrinsic
  source validation; that attempt was not counted as passing.
- Dependencies: `npm ci --prefix js`, lockfile TypeScript **5.9.3**.
  Installation reported one moderate audit finding; no unrelated dependency
  update was applied.
- Required sub-issues and initial issue/PR comment inventories: empty.
- Rust tools: deliberately unrun locally, following AGENTS.md.
- Complete gate: first attempt failed native lifecycle and process-group checks
  because this container's PID 1 left exited descendants as zombies. Lint and
  121 acceptance tests passed. Parity remained red. Forward translation was
  interrupted before an OOM kill when aggregate memory reached the 2.92 GiB
  container limit; reverse translation was unrun. No container OOM kill occurred.
  Source drafting continued during this failed attempt; it is not an immutable
  final-source qualification. A final attempt with a child reaper and bounded
  Node heaps is pending, retaining every test and original deadline.
- Full Rust-forward/profile regeneration and final-head CI: pending.
- Initial-head CI: Node, Bun and lint passed; TypeScript and parity failed;
  profile matrix failed with a V8 heap-limit abort, reverse translation was
  cancelled by CI, and forward translation was still running at the last
  observation. Full logs will be collected after the entire cycle completes.

No green gate stamp, complete parity, vendor-account setting change, or blanket
geolocation privacy claim is established by this draft evidence.
