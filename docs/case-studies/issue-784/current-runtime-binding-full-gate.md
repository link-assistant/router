# Complete local gate at the current registration

[PR #785](https://github.com/link-assistant/router/pull/785) remains incomplete.
The unchanged complete local gate ran against
`73b2b85e7d1380a71958402db749ed80a4d775a7`, with Node 20.20.2, Bun 1.4.4
and lockfile-installed TypeScript 5.9.3. No Rust tool ran. Neither this attempt
nor the earlier attempts produced a green stamp.

| Original workload | Result |
| --- | --- |
| Initial complete fingerprint | Pass: 51885 inputs, 1786365901 bytes |
| All ten lint commands | Pass |
| Whole native Node suite | 259 pass, zero failures |
| Whole native Bun suite | 256 pass, three failures; 90.15 seconds |
| Complete deadline-auditor controls | Ten pass; audit `complete-QSmfUc` passes |
| Public and native declarations | Both pass, TypeScript 5.9.3 |
| Native TypeScript freshness | Pass: 11586409 bytes, zero changed or unexpected artifacts |
| Strict complete native TypeScript compilation | Pass: all 167 files, TypeScript 5.9.3 |
| Whole native TypeScript test file | Nine assertions pass; independent deadline audit fails |
| Parity acceptance | Memory-interrupted after 104 completed assertions; no terminal suite result |
| Later commands | Nine later TypeScript commands, strict parity, all forward and reverse checks unrun |

The Bun native failures are retained at complete log lines 2276–2307:
`native-core.test.mjs:95` exceeds its original 5000 ms limit at 5001.56 ms;
the independent-process admission case at line 182 exceeds the same original
limit at 5005.54 ms. Bun kills one and three dangling processes respectively.
The following provider-deletion case receives a rejected child result with
SIGTERM. This identifies the observed failures, without attributing a cause
before tracing. The full compiled TypeScript runtime case later passes all
259 shared expectations in Node and also passes its Bun execution. That
independent success does not waive the earlier original-suite failures.

The original native regeneration drift case at
`tools/translation/js-to-rust/test/native-typescript.test.mjs:230` takes
69340.814828 ms against its unchanged 60000 ms deadline. Audit
`complete-iNZx8Z` records nine complete cases and exactly one duration breach;
the audited command exits 1. No assertion, test file or deadline is weakened.

The resource observer stops only the owned invocation when total container
memory reaches 2867978240 bytes, above its unchanged 2866933760-byte guard
within the 3135369216-byte container limit. It reaps every owned descendant
and exits 143 after 866.251 seconds. The initial completed-fingerprint page
advice neither pauses test clocks nor changes source contents. This is an
incomplete gate attempt, not a complete parity result or an allowed Rust run.

The [complete packet](evidence/current-runtime-binding-full-gate.tar.gz)
contains 96 whole members: the full gate log, command and memory receipts,
all twelve complete audit directories (including intentional negative
controls), original runners and relevant original test/storage sources.
Its size is 927597 bytes and SHA-256 is
`a5f8c89d101605d9eb3beb6d9a493247a39d3f36f339cb4b7d5289b43fb1e133`.
The [receipt](evidence/current-runtime-binding-full-gate.json.gz) records
every complete member hash, source head, command status and cleanup check.
Whole readback precedes retiring only inactive duplicate audit files,
reclaiming 2947963 logical / 3096576 allocated bytes. Task evidence is
379139920 bytes afterward, below its unchanged 500 MB limit.

Current canonical/owned/profile outputs, raw private compiler source bounds,
all original deadlines, strict parity and universal tool/account privacy
remain required. The reviewed source batch qualifies neither full parity nor
a newly executable application function.
