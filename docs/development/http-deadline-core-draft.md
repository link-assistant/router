# Closed HTTP deadline compatibility source draft

Three matching native/JS interfaces wrap actual HTTP open, read and buffered
send operations. Their fixed callbacks cannot be supplied by callers. They
retain separate outer cancellation/deadline errors and inner HTTP text errors.
All new implementation, receiving and independent oracle source is unrun.

Source review found that the general JavaScript deadline can resolve its timeout
before an active HTTP read finishes its abort/finally continuation. Returning
that exclusive stream loan early can expose a still-busy handle. The new closed
wrappers wait for their known HTTP child to settle before returning the outer
error. An owned stream completed just before the timeout is explicitly closed.
An interrupted read closes its borrowed stream after cleanup. Native read uses
the same started-operation condition and closes after its future was dropped.
The original general callback deadline and eight HTTP transport APIs retain
their behavior; arbitrary callbacks are not made to wait indefinitely.

Zero deadlines, invalid durations and preexisting cancellation do not start the
HTTP operation. An unstarted read keeps its original stream available. Success
retains the owned result or borrowed stream according to the original transport
contract. Closed callbacks let native future Drop and JavaScript settlement use
the same explicit cleanup abstraction without translating library internals.
General pending futures and arbitrary callback Drop still need their own rules.

The native source preparer reuses the complete-root/CST pattern and the existing
fresh atomic source installer. It retains full original root source, both rule
sequences, original file absence, complete new library source and output
inverses. The prior HTTP root producer receives an exact adjacent history and
keeps its direct file list. Complete original producer substitutions are retained.
No native grammar, executable ownership, namespace or parity authority follows
from a public source record, table row or source checksum.

An additive runtime-source API retains the old runtime roots and adds the actual
new JS/declaration pair. Fresh native import/CST checks require every dependency
and the original 128-source bound; all original source bytes are rejoined before
return. Source observations retain native/runtime/declaration inputs and the
unique root module edge as DATA. Actual caller qualification remains open.

Independent unrun cases cover loopback success, unstarted and started timeout,
preexisting cancellation, returned loan availability, nested results, strict
receiving declarations, actual source histories and full native oracles. A
separate isolated dependency harness exercises late owned-result disposal; it
does not qualify the real provider or issue compiler authority. Native oracles
run only after all eight unchanged same-SHA JavaScript stages pass in CI.
HTTP caller lowering/inverses/units, broader async domains, namespace/bootstrap,
production adoption/parity and every remaining requirement stay open.
