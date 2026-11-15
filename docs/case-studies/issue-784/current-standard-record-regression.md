# Standard method bodies preserve enclosing record bindings

The original-source record regression reproduces the temporary-name reset in
Option predicates, filters, two-callback mapping and borrowed string equality.
Before the repair, strict TypeScript reports TS2322: a boolean field becomes
the later integer field. Nested record construction also shares the enclosing
function's temporary supply and is covered by the regression.

Both original standard-source frames and non-filter Option callback bodies now
use the existing callback environment. Their return and loop boundaries remain
local to the selected method, while temporary names remain unique throughout
the enclosing function. Actual original-source checking, ownership and private
proof validation remain required. No generated output was edited.

| Complete file checks | Result | Seconds | Peak sampled cgroup bytes |
| --- | --- | ---: | ---: |
| Regression before repair | TS2322 failure | 6.043 | 2,761,244,672 |
| Regression, Node 20.20.2 | 1 passed; deadline audit passed | 11.627 | 2,798,612,480 |
| Regression, Bun 1.4.4 | 1 passed | 5.041 | 2,764,951,552 |
| Original callback/borrow file, Node | 7 passed; deadline audit passed | 17.198 | 2,835,087,360 |
| Original filter file, Node | 8 passed; deadline audit passed | 21.811 | 2,810,241,024 |
| Both original files, Bun | 15 passed | 23.265 | 2,840,104,960 |

All whole files retain their original assertions and deadlines. The regression
executes independently emitted JavaScript and strict-compiled TypeScript 5.9.3,
covering absent/present values, integer boundaries, both string equality arms,
and nested products. Existing negative cases reject forged proofs, mutable
captures, escaping loans and unsupported ownership.

Two earlier combined cohorts remain unsuccessful. The initial three-file
invocation stopped at 12.829 seconds / 2,871,963,648 bytes. A four-file attempt
with reduced Node old-space stopped at 12.913 seconds / 2,870,960,128 bytes.
Both reported two equality cases before the unchanged 2,866,933,760-byte guard
stopped their owned children; neither produced a complete deadline audit.
The remaining equality/application cases stay unqualified. The successful
checks above use separate complete files, Node children bounded to 192 MiB
old-space and the Node coordinator to 128 MiB. These are resource bounds, not
extensions to any original deadline or the aggregate guard.

The [complete evidence packet](evidence/current-standard-record-regression.json.gz)
retains original/current sources, complete test files, every failed and passed
stream, resource receipts and available independent audit directories. Each
decoded member is checked in full for length and SHA256. These focused passes
do not qualify current compiler registration, generation, strict parity, the
full gate or issue-wide privacy. No newly executable production function or
local Rust execution is claimed.
