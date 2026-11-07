# Matrix draft custody verification

The [complete preceding CI cycle](native-regeneration-ci-review.md) computes
all ordinary profile plans but discards their temporary bytes after reporting
freshness failures. The opt-in [custody implementation](../../development/matrix-draft-custody.md)
retains those bytes after the original validations. It does not regenerate
before checking, update checked-in artifacts or turn a failed check green.

The complete new custody controls and whole workflow file run together under
Node 20.20.2. The first attempt has 33 passes and two failures: the new final
uploader did not match an existing diagnostic expectation, and the historical
fixed-nine producer correctly refused the new callee workflow. The corrected
complete attempt passes all 36 cases and its independent Node deadline audit
in 98.53 seconds, sampled container peak 1617489920 bytes. Original assertions
and deadlines remain. The immutable historical producer/archive are unchanged;
the historical regression receives all fourteen original files. The new
workflow has separate complete source, both CST phases and inverse checks.

The complete `isolated-matrix.test.mjs` passes all eleven cases and its
independent Node deadline audit in 332.34 seconds, sampled peak 1936302080
bytes. It includes all original ordinary, retained, owned and retained-owned
comparisons, strict TypeScript execution, corruption/source-change refusals,
private issuer checks and complete source equations. The additional integration
case takes 17076.59 ms against its original new-case 90000 ms bound. It verifies
three complete profile plans, every decoded output hash, retained freshness
failures and unchanged checked-in bytes. This tiny receiving fixture does not
qualify the full Router corpus.

All three complete low-level custody cases also pass under Bun 1.4.4, whole
observed invocation 1.51 seconds, sampled peak 1531535360 bytes. The full
eleven-case matrix file has not been run under Bun for this draft. No timing
comparison here establishes a production speed gain. All selected process
trees are terminal and reaped. No source/definition matrix or new executable
function is claimed from these cases. Complete original logs, failed attempts,
raw Node streams and audit receipts are retained separately from summaries.

Compiler registration, whole exported receiving qualification, a current-head
full gate and fresh published CI remain independently required. Strict parity,
full corpus deadlines and literal tool/privacy obligations are still unfinished.
