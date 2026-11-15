# Bounded profile of a current ASCII evaluator call

The [experiment](../../../experiments/issue-784/profile-current-ascii-evaluation.mjs)
uses the actual reverse ASCII oracle and runtime source builders, constructs a
real owned-core receiving context, translates its four functions, prepares the
actual runtime, and samples one `hexadecimal` evaluator call on NUL. It does
not run the complete original test or its paired TypeScript target.

Under Node 20.20.2 with the selected 192 MiB old-space cap, that one call
returned the expected false in 3,043.13 ms. The profiler changes execution cost;
this is neither a baseline speed measurement nor deadline qualification.
The [complete CPU profile](evidence/current-37147a/current-ascii-one-profile.cpuprofile.gz)
contains 1,546 samples. Fresh `checkOwnedCoreProgram` validation appears on
1,396 sampled stacks, current source checks on 1,362, original module analysis
on 1,147 and runtime source reconstruction on 986. These overlapping inclusive
counts must not be added. Parsing, repeated intrinsic qualification and garbage
collection are visible costs; the runtime ASCII predicate is not the dominant
sampled path.

The [input receipt](evidence/current-37147a/current-ascii-one-profile.json.gz)
retains complete source input strings and the independent oracle. The complete
serialized meta was not retained; its SHA-256 is recorded. The source paths
are resolved with the repository's existing layout helper. The experiment
retains neither native compiler objects nor a permit across evaluations.
No production code or original test was changed by this profile.

Two earlier diagnostic attempts failed: one used an incorrect physical oracle
path; the second completed eight calls but exceeded the experiment's 8 MiB
raw profile bound before writing either result. Their complete process logs
and resource receipts are retained beside the successful profile. Eight-call
timings and the discarded profile are unavailable; no performance result is
claimed for that attempt. The corrected finite experiment samples one call
and keeps the same 8 MiB output bound.
