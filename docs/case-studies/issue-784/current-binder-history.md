# Complete binder helper source history

[PR #785](https://github.com/link-assistant/router/pull/785) remains unfinished.
The published head's [translation shard 8](https://github.com/link-assistant/router/actions/runs/42518964289/job/128848041459)
fails at retained log lines 2356–2364: the original binder comparison assumes
the physical helper ends with its historical binder addition. Later reviewed
scalar-store, scanner and lexer additions make that assumption false.

The complete receiving file now obtains the historical helper from the actual
invocation-local producer and authenticates the complete current helper through
the existing scanner source evolution. It retains the complete serialized and
reparsed source equations and inverses before running every original binder
assertion. An additional newline in the current helper still refuses. The
remaining seven cases continue to exercise current runtime and refusal behavior.
No production helper or original assertion or deadline changes.

| Complete eight-case file | Seconds | Peak sampled cgroup bytes | Result |
| --- | ---: | ---: | --- |
| Node 20.20.2 | 49.409 | 2,526,855,168 | Eight pass; independent deadlines pass |
| Bun 1.4.4 | 43.037 | 2,688,208,896 | Eight pass |

The original first case takes 25.719 seconds in Node and 22.776 seconds in Bun,
within its unchanged 60-second deadline. Neither observation reaches the guard.
The [whole receiving packet](evidence/current-binder-history.json.gz) retains
the complete published before and current source, producer inputs, command
streams, resource receipts and Node audit; all 26 members pass full readback.
Installed TypeScript is 5.9.3; CI uses Bun 1.4.3 and remains separately unqualified.
Newly executable production functions: zero. This is no immutable launch
snapshot, full gate, strict parity or universal privacy qualification. No Rust
tool ran.
