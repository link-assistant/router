# Original source-adoption controller investigation

The complete original Node receiving file still fails after the allocation
scanner repair at `21354e47e`. Seven cases pass; the actual workflow case
terminates its first Python producer at the original 20-second child deadline.
The complete file took 39.56 seconds without reaching the resource guard.
Its full raw output, resource receipt and independent deadline evidence are
retained in [the verified packet](evidence/current-allocation-controller-investigation.json.gz).

An explicitly enabled, finite Python call profiler then ran the same complete
file. It again passed seven cases and failed the workflow case, taking 40.52
seconds without reaching the resource guard. At 19 seconds the actual workflow
producer had written 803 source blobs, made 1,613 budget calls and completed
3,226 allocation scans. Allocation accounted for 16.59 seconds of inclusive
profiled time. This was still the initial source capture: the compiler child
had not started. Profiling adds overhead, so these observations identify work
without qualifying the original deadline.

A separate complete controller candidate used fresh directory-entry stats for
each complete scan. Four alternating rounds retained all 529 nodes and 24
complete scans per round. The existing string-path scanner took 120–138 ms;
the directory-entry candidate took 134–149 ms. It provides no measured further
gain and was not installed. The first candidate-control run failed because its
missing-child injection intercepted only the older stat transport. The corrected
diagnostic control passed; its complete temporary source remains inside the
measurement. The production regression fixture was restored unchanged. Both
failed and passed streams, every full candidate/source and the comparison are
retained in the packet.

The 20-second workflow criterion remains unmet. No deadline, resource limit,
fresh scan, original source input or production check was removed. These
diagnostics establish no newly executable application function, current
generation freshness, full-gate success, runtime parity or Rust verification.
