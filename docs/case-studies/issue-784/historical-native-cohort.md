# Matching complete historical native artifacts

The published `17c7dd9942814f2a6a17eee135016e5941f04f15` CI cycle exposes a
test-input association error. Four original reverse suites analyze the fixed
52-module native source archive but obtain their manifest or expected outputs
from the current 53-module tree. The added geolocation module is correctly
absent from that historical archive. Replacing the archive or removing its
original census assertions would invalidate the historical regression.

The repair captures both complete manifests and all 312 corresponding output
files from `eb2dad1c0a18394dc1aad46413e11401e74eb502`. Every input hash matches
the unchanged original archive. The reader verifies complete packed and raw
hashes, all 314 unique files, every source association and all six outputs per
module. Changed bytes and new current paths refuse. Callers receive a detached
file map; changing that map cannot alter the private source getter.

The four suites retain their complete original cases, assertions, workload and
deadlines. They still analyze the historical sources using the current compiler,
independently parse semantic meta and check both targets. Separate mandatory
current-source regeneration and strict parity checks remain in force. This
archive supplies historical comparison data, with no freshness or runtime
authority.

All five complete receiving files pass under Bun 1.4.4: 20 cases, 203.912493
seconds, sampled total cgroup peak 2773344256 bytes. The original 60000-ms cases
remain below their deadlines, including callbacks at 47369.52 ms and the closure
census at 49673.18 ms. CI uses Bun 1.4.3, which remains a separate observation.

Node 20.20.2 remains failed. The complete five-file 512-MiB-heap run has 19 TAP
passes and one cancellation; callbacks take 65226.474692 ms and the synchronous
closure census takes 62727.146269 ms. The independent deadline audit rejects
both. A complete two-file 768-MiB-heap diagnostic still fails at 61346.881259
and 60752.384431 ms. Increasing the heap did not qualify the original deadlines;
no limit is raised and this unchanged diagnostic will not be repeated.

No current executable production function is added by this historical-data
repair. The Node deadline failures, missing production profile generation,
strict parity and complete JavaScript gate remain unfinished. Rust is unrun.
