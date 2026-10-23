# Complete source checks and the remaining deadline failure

This continues #759/#772 after source checkpoint
`61a3f586fd152b6c10a6909c63e10b0bf5446755`. The translator is incomplete.
These source-preparation changes do not increase measured executable application
coverage or establish runtime parity.

The [complete evidence index](../raw/continuation-772/20261023-invocation-source-checks/index.json)
retains full compressed CI logs, all three downloaded deadline artifacts,
run/job metadata, source proposals, original failed attempts, raw local output,
deadline audits and resource observations. Each entry has a complete-byte hash
and a readback check. The pinned source profiles retain the complete original
modules used by each new producer.

## Completed published CI collection

All nine runs for published head
`5a19746ac912b8033962dc7e6eddedd0cac76e39` finished. Their checkout merge SHA
was `b0d5343bba67256feb58a29138cb343be73eb960`. The main run's 37 jobs ended
with four successes, five failures, three cancellations and 25 skipped jobs.
All 12 executed main-job logs and all three artifacts were completely read back
and verified. The eight supplemental runs were skipped. Rust did not start.

Canonical translation, Node tests, Bun tests and lint passed. TypeScript lacked
neutral outputs; owned-definition generation and its profile matrix encountered
an enclosing-method scope mismatch. Parity failed, and canonical profiles,
forward tests and reverse tests did not complete. Cancelled work is unqualified.
The separate enclosing-scope checkpoint fixes the captured method join in its
21-case Node/Bun receiving set; current full generation still needs checking.

The cancelled forward stream contains five explicit failures and additional
synchronous TAP passes beyond their source-declared deadlines. Examples include
the complete-plan comparison, repeated plans, a full derive case and the
serialization-schema projection case. They remain failures despite TAP `ok`.
Deadline artifacts from the auditor's own negative fixtures are retained as
expected controls, rather than mistaken for new production failures.

## Implemented source changes

The [source-check contract](../../../development/invocation-local-source-checks.md)
describes the three native/CST producers. They reuse complete reparsed phase
transports within one invocation, compare complete canonical forward/inverse
bytes, and batch native module checks with the original TypeScript 5.9.3 options
and diagnostics. Scripts retain their original separate checker. Module/script
isolation, missing names and initialization errors have independent controls.

The actual five-file provider producer regenerated its dependent sources;
every original whole test body and deadline remains unchanged. Original public
concrete APIs and the original standalone native checker remain intact. No new
source/hash/owner/verdict/encoded-result cache persists across invocations.

## Qualification and limits

The complete five-file receiving batch contains 25 cases. Node's functional
assertions pass, but its independent deadline audit is **red**: the full birth
versus current plan comparison takes 80,889.691 ms against its unchanged
60,000 ms deadline. Bun passes all 25 cases and their original deadlines.
The full runs take 263.804 seconds / 1,062,813,696 bytes peak aggregate RSS on
Node and 208.800 seconds / 1,894,416,384 bytes on Bun. These observations are
not controlled before/after benchmarks or general engine comparisons.

A final native-selected trivia correction removes generated trailing spaces.
Both complete affected source-control files then pass all seven cases on each
engine. Their final Node/Bun runs take 14.721/13.990 seconds. The prior 25-case
observations retain their exact earlier source epoch; the final small receiving
set does not convert Node's outstanding whole comparison into a pass.

Earlier Node runs retain two and one deadline breaches respectively. All source
proposals and independent complete CST/inverse reviews are retained, including
the intermediate provider-generation refusal caused by two concrete imports;
the corrected producer selects and extends the original single native import.

Full current canonical/profile generation, owned definitions, strict target
TypeScript, reverse/export freshness, strict runtime parity and the complete
same-SHA JavaScript gate remain open. The last measured 163/2,570 executable
functions is a historical census, not a new result for these compiler inputs.
No local Rust tool ran; Rust must run in CI only after every required JavaScript
stage passes for the same immutable SHA.
