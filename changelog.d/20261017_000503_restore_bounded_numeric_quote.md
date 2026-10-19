Restore the exact pre-493 numeric quoted-length measurement and its five
helper/source-oracle files. Remove the experimental 493 fragment from the
current source tree; the original commit, full snapshots, raw results and seal
remain in history. No cache limits, guards, source/hash checks, native Hash
arguments, deadlines or original pre-experiment workloads change.

Actual 493 receiving passed the five focused cache files (41 cases per engine),
but the original full thirteen-case file remains unqualified. Node reported all
13 functional cases passing while the unchanged 60-second case took
141,480.160792 ms (165.75594 s whole file). Bun was stopped at 22.420806 s by the
unchanged 3 GiB aggregate cap: sampled RSS 3,247,669,248 bytes exceeded
3,221,225,472 bytes; its thirteen-case run has no terminal pass result.

This removes the experiment's additional primitive native-quote temporaries;
it does not establish their causal contribution or promise a performance gain.
The restored numeric path and current complete compiler graph require fresh
receiving/profile qualification. Original 60-second performance remains RED.
Source-only rollback: no engines, Rust or generators were run by this worker.
