# Independently audit declared Node case deadlines

Node's timeout callback needs the event loop. A synchronous case can block that
callback, finish later than its declared limit and still receive a Node pass.
Treat such an observed duration breach as a failure. Preserve the original
case, source limit, whole file and concurrency; do not filter cases, move work
outside the case or normalize its report to obtain a pass.

`node scripts/run-node-tests.mjs` implements that independent check. It invokes
the same complete Node test files and unchanged concurrency
through Node's public reporter API. Its reporter forwards every original event
to Node's own public TAP reporter, collecting audit errors without aborting the
stream. Original failed tests and all later events remain in the full TAP.
The wrapper requires both the Node exit and the complete audit to succeed.
No Node default or Bun five-second default is invented for an unbounded case.

The source audit joins each completed structured event's actual file, line,
column and name to its exact call expression in the complete original source.
It parses with the repository-installed TypeScript 5.9.3, rejects recovered
syntax and retains full sources, SHA256, fd/path identities, call spans, actual
reported durations and original Node pass/fail classifications. Duplicate names
at different positions and nested cases are independent observations. A missing
or ambiguous observed join/deadline fails closed. Duration equal to the finite
source limit passes; any greater value fails without rounding or grace time.
Selected source bodies and identities are frozen before the child starts and
rechecked against the complete audit after it closes. A reported callsite in an
unselected helper refuses rather than receiving an after-the-fact source claim.
Only the OS-owned macOS `/tmp` and `/var` aliases are canonicalized; other linked
source/output paths refuse. Reads allocate only the prechecked file size, use
bounded positional reads and a one-byte EOF probe, then require unchanged
fd/path identity; growth or truncation refuses. No module loader or source
execution is replaced.

Supported source limits include numeric literals, closed arithmetic and lexical
`const` numeric bindings. Simple const option objects/aliases may be shared only
through other const aliases and direct imported built-in Node test options;
mutations, other escapes, dynamic scope, spreads, duplicate timeout properties,
accessors and unknown values cannot qualify a finite deadline. Ordinary literal
computed string/number keys are allowed; a computed identifier/expression and
an explicit `__proto__` initializer refuse instead of being called a default.
Two-argument registrations qualify as named defaults only when their first
argument is provably a primitive string: a literal/template, a lexical const
with such an initializer, or addition with at least one recursively qualified
string operand. Arbitrary dynamic expressions remain ambiguous. The existing
portable fixture cohort uses template names; all 32 current fixture names are
already strings, so names, bodies and case limits stay unchanged. Literal
options on an observed `context.test` call use that exact reported callsite.
This restricted source inspection is an audit of the declared budget, not an
interpreter or a source of translation/runtime authority. Other unresolved
option forms fail when observed; unobserved finite declarations and cases with
no explicit source limit stay separately recorded, without a coverage claim.

The local gate and reusable CI use the wrapper for the complete forward,
reverse and native-TypeScript compiler cohorts. Two-worker discovery and every
existing case deadline stay unchanged. Existing CI enclosing limits stay fixed:
the forward wrapper is bounded to 3,600,000 ms and reverse/native-TypeScript to
900,000 ms. The wrapper refuses name filters and other test-selection flags.
All other mandatory gate commands and the Bun commands remain independent.
A wrapper success does not replace the same-SHA full gate or strict parity.

Each invocation creates a fresh ignored directory under
`js/node_modules/.node-case-deadlines/`. It streams complete
stdout TAP and stderr into exclusive raw files while forwarding them unchanged,
then retains command, full source audit and terminal receipts. The signal and
finite enclosing timer terminate the owned process group, escalate after one
second and wait for the direct child's close. Direct close does not cancel
the escalation while the owned Unix group is still present: its disappearance
is polled within both a two-second shutdown bound and the unchanged enclosing
deadline. Cleanup time counts against that deadline; incomplete cleanup fails
and retains the signal/error observations. Windows does not claim Unix
process-group cleanup. A 256 MiB per-stream observed stop threshold terminates
the run on excessive output while retaining the full partial received before
closure; it cannot produce success. The final source/audit receipt is bounded
to 128 MiB. No previous log, source, cache or failed output is removed.

CI always uploads these narrow output directories with the repository's pinned
artifact action, including hidden files. Structural workflow controls require
the uploader after every compiler command, its exact job/SHA identity, complete
path and fail-on-missing behavior. The actual audit tests run in the TypeScript
stage under the same auditing runner with a finite 180-second enclosing limit,
after the locked compiler install. The existing lint discovery regression
also runs the real wrapper, so lint installs that same locked package before
its receiving fixture; no separate compiler version is introduced. Strict
TypeScript selection and its existing override
are unchanged and the override is recorded, not rewritten.

The nine complete core source/audit and subprocess controls passed receiving
checks under both Node and Bun at `bf861fc931f8fe79482cc2d3c0034d040c3f72c6`.
They cover synchronous overdue work, nested/duplicate/default cases, large
output, original failures, exact boundaries and ambiguous or mutated source.
The ninth control retains an actual ignored-stdio descendant identity and
SIGTERM tape, requires SIGKILL escalation and observed group disappearance,
and provides finally cleanup for its own descendant. It requires Unix.

Receiving checks exposed an outside-root temp fixture and an auditor that
rejected the required always-run uploader. The corrections keep selected-root
enforcement and every check step unconditional; only the unique, fully
validated, non-run evidence action receives an `always()` exception. The
complete corrected local seven-case and workflow 23-case files passed both
engines at `96376614a03516296a5786192966e55bc04b9230`, preserving all original
deadlines and the installed TypeScript 5.9.3. Full compiler cohort, complete
gate and CI qualification remain separate pending checks. No Rust tools ran
locally, and no generated artifact or source deadline was changed to obtain
these receiving results.
