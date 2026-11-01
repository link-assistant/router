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

## Additive receiving source draft

A separate full cohort implementation copy adds bounded real-Git object batches
and explicit path-based index/tree reservation. Each batch reserves its own
worst-case object writes before execution. A real raw index then stages every
actual object/mode/path and a real commit is checked against the whole requested
cohort. File identity/time checks bracket preparation. This is operational input
packaging, not source/type/ownership permission; original APIs stay available.
All Git calls and lifecycle/resource observations remain UNRUN.

The additive `receiveOpaqueBoundedBodyLiterals` now contains the receiving
integration source. It copies every compiler-fingerprint input and actual native
source before selecting profile resources from current preflight reads and full
source-copy custody. Missing original profile resources can be acquired only
from a fresh source-phase ENOENT hint. Every acquisition starts a new process;
no private issuer graph or compiler verdict survives. The aggregate is bounded
at16 attempts,8MiB raw child output,8MiB failed packets,60s whole case and20s
per child. Already copied missing inputs, runtime failures and paths outside the
fixed source-profile directory cannot trigger recovery. The intentionally
untracked native-leaf refusal is preserved across recommits.

The new storage API counts unique retained source buffers against64MiB, with
separate file identities, read-occurrence accounting and complete closing reads.
It checks byte equality before sharing any buffer; a matching hash alone grants
nothing. This is an explicit new storage contract: the original APIs keep their
cumulative read accounting. A reused64KiB comparison buffer limits duplicate
read allocations. Whole closing reads and compiler data can still add transient
memory; neither an RSS fit nor a successful complete receiving run is claimed.
The entire actual read-only TypeScript package and5.9.3 lock cohort remain
required, with no dependency installation authorized in this phase.

Six whole case files are drafted for Git batches, profile inputs, resource
census lifecycle, failure-hint refusals, full receiving and complete source
history. All remain UNRUN. The full source-copy archive preserves three complete
predecessors/successors, three additions, two prerequisite case files and all
six current case files. Its visitor consumes the parent body history and unions
the complete parent case custody with conflict refusal, serialized/reparsed CST
and full inverse images under exactly language/repository sequences.

Archive SHA256: `55df36d1dfed80133daf0705f512beb13f70b3f51f22ba8db76fbbe72f74458e`
(174,511 decoded/27,740 packed bytes); authored visitor SHA256:
`6790918afd9af18ce9e57fe160cc52ea53e5a575281200f78617601f515d453f`.

Original receiving APIs have not been migrated to the new storage contract;
their complete old cases and every resource/performance/strict TS/parity/freshness
obligation remain required. No profile-size inventory or helper source draft
qualifies a receiving repository or closes E01/E03/Q02/T05.

This finding is separate from the frozen delivery audit and its commit timings.
Commit intervals and source receipts are not executable-function throughput.
No complete-delivery date or current code-coverage percentage follows. The
checklist remains9/70 DRAFTED,61 OPEN; L01/L02/Q02/T05/E01/E03 and broader
translation/synchronization requirements still need their complete evidence.
