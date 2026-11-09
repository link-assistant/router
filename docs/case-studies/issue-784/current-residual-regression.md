# Independently checked static Result residuals

The original ActivityPub application check in published job 128901874967
refuses borrowed Result propagation in `validate_activity`. The small regression
reproduced that refusal before the change. A borrowed success can now propagate
a genuine `&'static str` error when the canonical Result identity, written
static region and actual error-leaf origins independently agree. Dynamic errors
and success values cannot acquire static origins from a destination annotation.

The first draft exposed another return-analysis defect: an actual `Ok` was
required to supply an origin for its absent `Err` payload. Absence is now checked
from the typed constructor and complete control branches. A missing public leaf
record supplies no authority. Existing owned String error handling remains
separate.

| Complete check | Result |
| --- | --- |
| New Node file before repair | Positive case failed; refusal case passed |
| First Node draft | Positive case failed return-origin checking |
| Final new Node file | 2 passed; original deadline audit passed |
| Final new Bun file | 2 passed |
| Original lifetime Node file | All 9 passed; original deadline audit passed |
| Original ActivityPub/Option Node file | Resource guard stopped the complete file before a case completed |

The original lifetime file took 35.924 seconds and peaked at 2,814,803,968 sampled
cgroup bytes. The complete ActivityPub file reached 2,870,697,984 bytes after
30.944 seconds; its incomplete audit and every owned child were collected.
Node 20.20.2, Bun 1.4.4 and lockfile TypeScript 5.9.3 were used. Whole files,
strictness and original deadlines are preserved. Unicode, empty/NUL strings,
both residual branches and two sequential propagation sites are checked in
JavaScript and strict TypeScript. Three lifetime-escape refusals remain covered.

The [complete packet](evidence/current-residual-regression.json.gz) retains the
original/current checker, whole tests, failed intermediate attempt, complete
streams and available audit directories, with decoded length/SHA256 checks.
It also records lossless compression of 28 inactive observations: 8,040,228
logical bytes and 8,015,872 allocated bytes reclaimed. Append `.gz` to each
original observation path in that receipt to recover its complete bytes.

The actual ActivityPub application remains unqualified. Newly executable
production functions measured: zero. No full-gate, receiving, generation or
strict-parity success is claimed; Rust was not run.
