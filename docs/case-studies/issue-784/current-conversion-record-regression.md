# Preserve record bindings across original source conversions

The completed CI cycle for `764222b6e6d4f0ce1efb0341396cfb6a87661e85`
reported strict TypeScript constructor errors in translation jobs
`128880489043` (line 1902) and `128880489087` (line 2851).
An `Option<UsagePool>` temporary had replaced the earlier provider binding.
The complete decoded subprocess diagnostics and original logs are retained.

The finite `probe-record-field-emission.mjs` reproduces the alias in a small
`Usage` record. Checking an original `From` body with a fresh plain environment
resets `ControlChecker`'s enclosing temporary-name counter. Later fields then
reuse earlier names. The primitive identity `From<T>` checker independently
has the same problem: repairing only the string conversion leaves scalar
records with an incorrect earlier value.

Both nested body checks now use the existing callback environment. This
preserves their independent control boundary and the enclosing name supply.
Original body parsing, source authentication, expected ownership and private
proof issuance still run. No generated checker source was edited.

The new complete regression independently checks TypeScript and executes both
targets for both enum values, reversed field order, nested records and three
primitive identity values. It failed before the repair. The complete cohort
also includes both original conversion test files, preserving all 45 existing
cases, strictness and deadlines.

| Attempt | Result | Observed seconds | Peak cgroup bytes |
| --- | --- | ---: | ---: |
| New regression before repair | Failed strict TypeScript | 4.728 | 2,577,088,512 |
| String-body repair alone, complete Node cohort | 45 passed, scalar regression failed | 26.097 | 2,572,705,792 |
| Both body repairs, complete Node cohort | 46 passed; independent deadline audit passed | 23.123 | 2,626,600,960 |
| Both body repairs, complete Bun cohort | 46 passed | 14.904 | 2,605,506,560 |

Runs used Node 20.20.2, Bun 1.4.4 and the lockfile TypeScript 5.9.3 with an
inherited 384 MiB Node old-space bound. No run hit the unchanged resource guard.
Whole before/current source files, the reproducer, complete logs, memory
receipts and Node deadline evidence are in
[`current-conversion-record-regression.json.gz`](evidence/current-conversion-record-regression.json.gz).
The retention script verifies every decoded member's full length and SHA256.

This establishes the small behavioral regression and original conversion
cohort. The two complete application parents still require qualification;
their original CI deadlines also failed. The full JavaScript gate, current
compiler registration, parity and issue-wide privacy requirements remain
unfinished. No local Rust tool ran and no production coverage gain is claimed.
