# Current private compiler closure remains over its bound

[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
The current complete private compiler test still requires its original 4 MiB
raw-input bound. A finite diagnostic follows every actual static import and
re-export from all four entry roots and all three original core source recipes.
It parses the full sources with lockfile TypeScript 5.9.3, without producing a
private plan or executing the graph. The diagnostic's larger input allowance
does not change the production limit or qualify production execution.

The actual closure contains 338 modules from 337 original files, totaling
4,641,046 raw bytes: 446,742 bytes above the unchanged 4,194,304-byte limit.
There are 2,304 static edges. The largest original file is 121,625 bytes;
removing one large embedded asset cannot account for this excess. The complete
source census and literal spans are retained for investigation.

Two actual native imports, `node:module` and `node:buffer`, also lie outside the
production native-import allowlist. The diagnostic records these unsupported
routes; it does not permit them in the production plan. Its first attempt
incorrectly refused `node:module` while discovering the graph. That failed
2.316-second attempt is retained alongside the corrected 2.519-second census.
Neither attempt hit the container guard. The second sampled peak is
2,082,455,552 bytes across the entire cgroup.

The [complete packet](evidence/current-private-closure-census.json.gz) contains
both whole observations, the failed and corrected diagnostic programs, and
every complete original input. All 338 observation inputs match their complete
Git blobs at the recorded immutable source commit. This is a verified source
comparison after the observation, not an immutable launch snapshot. No raw
bound was raised, source body omitted, or production plan admitted. This work
adds zero executable production functions and leaves the original receiving
test, strict parity and complete gate unqualified. No Rust tool was run.
