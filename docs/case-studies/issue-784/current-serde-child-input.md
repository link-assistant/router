# Derive callback child dependency inputs

[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
The published head's [translation shard 8](https://github.com/link-assistant/router/actions/runs/42518964289/job/128848041459)
fails at retained log lines 2828–2838: a callback-mutation child reads the
workspace Cargo files instead of the repository source profile. The dependency
manifest refuses before the intended callback checks execute.

The child now receives absolute Cargo manifest and lock URLs from the same
repository source resolver already used by its parent. All three pre-import
mutation modes, callback counts, legacy comparisons and private-index refusals
remain. The 15-second child deadline, buffer bound, complete six-case file and
all original assertions remain unchanged. No production compiler changes.

| Complete six-case file | Seconds | Peak sampled cgroup bytes | Result |
| --- | ---: | ---: | --- |
| Node 20.20.2 | 6.758 | 2,412,572,672 | Six pass; independent deadlines pass |
| Bun 1.4.4 | 6.041 | 2,312,122,368 | Six pass |

The [whole receiving packet](evidence/current-serde-child-input.json.gz) retains
the complete published before and current file, dependency implementation and
manifest, command streams, resource receipts and Node audit. All 20 members pass
complete readback. Neither observation reaches the guard. Installed TypeScript
is 5.9.3; CI's Bun 1.4.3 remains independently unqualified. Newly executable
production functions: zero. No full gate, strict parity, immutable launch
snapshot or universal privacy qualification is claimed. No Rust tool ran.
