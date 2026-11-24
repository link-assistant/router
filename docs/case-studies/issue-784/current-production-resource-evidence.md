# Current production and complete-gate resource results

The complete local JavaScript gate at `8f4205079` passed lint, all 259 Node
cases and all 259 Bun cases. The TypeScript stage passed its nine deadline
control cases and their independent audit, then the unchanged aggregate guard
stopped strict `js` typechecking. Total elapsed time was 355.285 seconds, with
2,867,585,024 sampled cgroup bytes. The remaining TypeScript commands, parity,
forward translation and reverse regeneration are unrun. There is no green stamp.

The separate completed-fingerprint page adviser finished successfully in
33.591 seconds after all 49,192 fingerprint inputs completed. It advised only
identified closed tracked files; contents, the guard and active clocks were
unchanged. This success does not erase the earlier adviser's `/proc`
permission failure or qualify the interrupted gate.

All four actual production families were attempted sequentially at that same
source head, without editing their generated outputs:

| Complete producer | Result | Seconds | Peak sampled cgroup bytes |
| --- | --- | ---: | ---: |
| Canonical | 192 MiB V8 heap exhaustion, exit 134 | 46.366 | 2,752,757,760 |
| Owned canonical | 192 MiB V8 heap exhaustion, exit 134 | 40.567 | 2,801,152,000 |
| Profile matrix | aggregate guard, exit 143 | 11.492 | 2,868,531,200 |
| Owned profile matrix | aggregate guard, exit 143 | 7.560 | 2,867,130,368 |

A changed canonical experiment at `000b0547e` used a 320 MiB V8 heap and
bounded advice for closed tracked-file pages. Its full 397-module graph
completed, but namespace construction exhausted V8 at 96.466 seconds, exit
134, with 2,650,513,408 sampled cgroup bytes. All twelve adviser children
finished and were reaped. This experiment retained the 2,866,933,760-byte
aggregate guard, complete inputs and clocks. It produced no qualified output.
Repeating these unchanged resource failures is not a validation strategy;
adequately provisioned CI remains necessary for complete generation.

The [complete custody packet](evidence/current-production-resource-evidence.json.gz)
contains whole streams, resource receipts, available Node audit directories,
and original/current observer source. Large adviser archives are retained
byte-for-byte in the packet's adjacent `current-production-resource-files`
directory. The manifest records original and retained paths, complete archive
and decoded hashes, with full JSON readback verification. Only the duplicate
inactive task-owned CI-log copies were removed after this transfer.

All results are failed/unrun production evidence, not receiving qualification,
strict parity, full-gate success or issue completion. No Rust tool was run.
