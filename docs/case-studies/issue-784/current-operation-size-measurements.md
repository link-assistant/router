# Operation size measurements

Draft toward [PR #785](https://github.com/link-assistant/router/pull/785).
The private composer previously repeated successful size measurements for shared
frozen subtrees on successive calls within the same synchronous operation.
Measurements now share one weak-keyed store within that operation, bounded to
1,024 positive scalar records with at least 64 measured cells. Each record keeps
only units, cells, text and height. No encoded bytes, verdicts or source authority
enter this store. Native fallback clears it before invoking original callbacks;
operation exit clears it as well. Every whole-graph eligibility check, native
intrinsic guard and original logical budget remains mandatory on each call.

The actual operation and whole-owner source producers install their complete
outputs through three ordered source substitutions and exact inverse replay.
Both serialized/reparsed CST phases and independent native source checks remain.
The default adoption producer restores that additional source history before
joining its unchanged original guarded consumer. All nine default outputs remain
byte-identical. Complete public plans precede installation:

| Plan | Compressed bytes | Complete plan |
| --- | ---: | --- |
| Operation | 508,075 | [Archive](evidence/current-operation-measurement-operation-source.json.gz) |
| Consumer | 16,114,037 | [Archive](https://github.com/link-assistant/router/blob/93995ee40be4b570becbe0b788dba58f5bd0ea6f/docs/case-studies/issue-784/evidence/current-operation-measurement-consumer-source.json.gz?raw=true) |
| Default, corrected capture | 12,285,010 | [Archive](https://github.com/link-assistant/router/blob/93995ee40be4b570becbe0b788dba58f5bd0ea6f/docs/case-studies/issue-784/evidence/current-operation-measurement-default-source-v2.json.gz?raw=true) |

The first default capture incorrectly compared a JSON data projection against
live rule callbacks. It failed before installation. Its [complete plan](https://github.com/link-assistant/router/blob/93995ee40be4b570becbe0b788dba58f5bd0ea6f/docs/case-studies/issue-784/evidence/current-operation-measurement-default-source.json.gz?raw=true)
and full failed stream remain retained. The corrected capture compares the whole
JSON projection, preserves executable callbacks in source and confirms every
physical default output is unchanged. JSON data grants no execution authority.

The three linked complete plans remain in immutable published commit
`93995ee40be4b570becbe0b788dba58f5bd0ea6f`. After matching every local byte to
that commit and fresh GitHub metadata, their inactive local copies were retired
to reserve space for the next complete CI artifacts. The
[custody receipt](evidence/published-measurement-copy-retirement.json.gz)
records 40,683,907 logical bytes reclaimed. No failed evidence was discarded
and no additional check or performance result is established by this cleanup.

Both complete test files pass using installed TypeScript 5.9.3:

| Engine / scope | Cases | Observed elapsed | Sampled total cgroup peak |
| --- | ---: | ---: | ---: |
| Node 20.20.2, operation | 8 | 13.532428 s | 1,972,322,304 B |
| Node 20.20.2, default adoption | 7 | 75.970052 s | 2,088,402,944 B |
| Bun 1.4.4, both complete files | 15 | 76.759709 s | 2,390,933,504 B |

Both independent Node audits report zero breaches, missing deadline observations
or auditor errors. The new warmed-measurement regression still exercises the
original cell, depth, text and output refusals and callback boundaries. Public
source-rule copies cannot mutate the private inverse rules. No deadline, file
selection or budget was relaxed. Local Bun does not qualify CI's Bun 1.4.3.
The [33-member complete check archive](evidence/current-operation-measurement-checks.tar.gz)
and [member receipt](evidence/current-operation-measurement-checks.json.gz)
retain complete streams, failed capture, both Node audits and a bounded actual
production profile with SHA-256 readback.

That production diagnostic uses all 397 original library modules but deliberately
terminates after a 15-second namespace sampling window. It exits by the explicit
diagnostic stop, without qualifying the original complete production test. Its
66.704661-second observer run peaks at 2,413,498,368 sampled cgroup bytes. Different
phase coverage prevents comparison to the earlier profile. No production speedup,
deadline repair, additional executable function or complete-gate pass is claimed.
The earlier complete production allocation failure and source-preservation
deadline failure remain unresolved. Strict parity, freshness, profile matrices
and universal account/tool privacy obligations are also unfinished. No Rust tool
was invoked.
