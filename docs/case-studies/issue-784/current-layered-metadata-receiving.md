# Complete metadata receiving by declared source layer

Forward shard 7 at `f86824ea2eff18895db3ea809373457ebeb66a83` fails the
complete source-lifetime case at log line 3024. Its complete thirteen-layer
composition exceeds the receiving helper's 256-document call limit. The
existing helper and its wire budgets remain unchanged.

The receiving coordinator now creates an independent bounded call for each
declared source layer. It preserves the original document order, every repeated
import, fresh document objects, complete serialized CST assertions and all
native/source inverse assertions. It requires every layer to finish and bounds
the explicit layer census to 256; each call still rejects more than 256
documents. All work stays inside the original complete test case and its
unchanged 60-second deadline. No source document is removed or deduplicated.

The complete six-case receiver file passes in Node and Bun. Controls retain
the original three cases and add 504 independent imports across two layers,
late forgery refusal, incomplete final-layer detection and both census bounds.
Node's independent source-declared deadline audit passes. An earlier Node
attempt stops at the unchanged memory guard before any case; it remains
separately retained. Page advice on closed task-owned tracked files then lowers
observed cgroup use from 2,761,388,032 to 2,421,899,264 bytes without deleting or
changing source files or pausing any test clock.

The actual complete lifetime file remains unqualified: Node reaches the
unchanged guard after 80.930 seconds and Bun after 18.808 seconds, with no
complete case report. The original timeout is not extended. Focused receiver
passes do not qualify the larger case or establish a performance improvement.

The same CI shard also fails the three original CSV frontier assertions at
lines 1048, 1073 and 1107. Their existing assertions now include the complete
same-file refusal list only on failure; the successful path prints nothing.
All source pins, input discovery, one original compilation, runtime vectors
and deadlines stay intact. The large CSV file is not rerun locally, and its
semantic and deadline failures remain unfinished.

The [complete packet](evidence/current-layered-metadata-receiving.json.gz)
retains all before/after sources, controls, receiving failures, deadline files
and resource receipts with whole-member readback. These receiving-only changes
measure zero newly executable production functions. [PR #785](https://github.com/link-assistant/router/pull/785)
remains draft.
