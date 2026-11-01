# Static receiving footprint and remaining resource draft

Status: SOURCE REVIEW / UNRUN. The adjacent JSON records a lower-bound inventory
of tracked paths and current source-drafting file sizes at7526e1209. New untracked
paths were excluded; it is not an executed receiving test, compiler diagnostic,
translation trial or runtime profile. No dependency installation was attempted.

The old recursive copier selects every source-profile file, although that folder
is explicitly excluded from the global compiler-module fingerprint selector.
The reviewed minimum is5,739 profile files/164,564,056 bytes plus2,761 compiler
code/data files/31,455,702 bytes. Combined8,500 files/196,019,758 bytes already
exceed its8,192-file/64MiB bounds before native inputs, read-only TypeScript,
Git storage or outputs. A failed complete receiving case must stay failed;
none of the source-only prototypes is qualified by these inventory numbers.

The complete tracked Rust corpus adds1,295 paths/11,011,521 bytes. Even without
any source-profile files, reserving the old shared compiler-cohort estimate of
1.25 times every source blob plus4MiB on top of copied compiler/native sources
requires at least99,745,556 bytes, before path/index overhead. This conservative
all-at-once Git reservation cannot fit64MiB. Free host disk does not change that
case-local bound. Raising limits or excluding real compiler/native input work
is not the proposed remedy.

## Source work being drafted

A separate full cohort implementation copy adds bounded real-Git object batches
and explicit path-based index/tree reservation. Each batch reserves its own
worst-case object writes before execution. A real raw index then stages every
actual object/mode/path and a real commit is checked against the whole requested
cohort. File identity/time checks bracket preparation. This is operational input
packaging, not source/type/ownership permission; original APIs stay available.
All Git calls and lifecycle/resource observations remain UNRUN.

The complete receiver also needs an explicit actual resource closure rather than
copying all historical profiles, with full dependency provenance, complete raw
failed-attempt receipts, fresh process/issuer frames after missing-resource
acquisition and unchanged source/file/disk/deadline guards. Invocation-local
input-byte sharing must retain separate path identities and complete closing
checks. Read-only TypeScript still needs its entire actual package/lock cohort.
These integration/qualification obligations remain OPEN; the batched Git helper
alone does not make a receiver fit or qualify translator export.

This finding is separate from the frozen delivery audit and its commit timings.
Commit intervals and source receipts are not executable-function throughput.
No complete-delivery date or current code-coverage percentage follows. The
checklist remains9/70 DRAFTED,61 OPEN; L01/L02/Q02/T05/E01/E03 and broader
translation/synchronization requirements still need their complete evidence.
