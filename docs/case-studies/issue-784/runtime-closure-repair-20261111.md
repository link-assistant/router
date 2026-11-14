# Runtime closure and exact receiving-history repairs

PR [#785](https://github.com/link-assistant/router/pull/785) remains incomplete.
The published `124edb33e096a2c018caf449214005ad555d8bdd` CI cycle is still
running. These focused results establish neither a green complete gate nor
runtime parity; no new executable production functions are claimed.

## Missing runtime dependency

The new macro lexical-storage integration imported `static-rust-tokens.mjs`,
but the independently declared runtime closure did not include that module or
its guard dependencies. The original complete runtime-closure test reproduced
the missing-module failure before source changes. CI reverse job 130426612971,
line 304, independently refused the unregistered materialized asset; forward
job 130426612923, line 1491, failed a fresh runtime import.

Restore the complete original `macro-token-trees.mjs` and
`builtin-ast-builder-meta.mjs` from their existing full historical fixture.
Retain the withdrawn published source in a separate full, hash-checked fixture
and preserve both complete forward/inverse CST equations in the six original
storage cases. The standalone bounded lexical DATA reader retains its own
tests, but is no longer a dependency of these runtime APIs. No speed gain is
claimed for the withdrawn integration.

## Missing complete receiving successor

CI forward job 130426613001 failed the original facade/AST producer at lines
871, 907, 928 and 949 with `unregistered complete receiving successor`; the
original path-reentry case failed at line 1117. The earlier struct ordering
change had genuinely extended `derive-output-effects.test.mjs`, while its
receiving history still recognized only the exact preceding complete file.

An independently pinned three-rule source profile now records that exact
extension. The original complete input, earlier history, native selections,
serialized/reparsed language and repository phases, and full inverse remain
checked. Historical comparison cases retain their exact predecessor through a
scoped DATA reader; new complete-current cases verify the physical current
file and reject changed deadlines, weakened private assertions and unknown
successors. The genuine facade/AST producer's complete freshness check passes.

## Focused verification

Node is 20.20.2, Bun is 1.4.4, and the lockfile-installed TypeScript compiler
is 5.9.3. CI's pinned Bun 1.4.3 remains a separate qualification.

| Original complete files | Node | Bun |
| --- | --- | --- |
| Runtime closure and macro storage | 7 passed | 7 passed |
| ASCII base assets | 4 passed | Memory guard stopped; no case completed |
| Paired canonical types | 10 passed | 10 passed |
| Module-token and new ordering histories | 7 passed | 7 passed |
| Facade/AST receiving history | 7 passed | Memory guard stopped after 4 passed; file unqualified |

All completed Node deadline audits pass with the original limits. The Bun
ASCII attempt stopped after 27.595 seconds at 2870657024 sampled cgroup bytes;
its owned processes were reaped. The Bun facade/AST file stopped after 63.373
seconds at 2868330496 sampled cgroup bytes. Both files are unqualified and were
not repeated unchanged. The passing Bun paired-types file took 139.256 seconds with a
2827153408-byte sampled cgroup peak. Sampling does not measure a complete
process peak or qualify a different workload.

Complete sources, failed attempts, raw reports, resource receipts and deadline
audits are retained in the [repair packet](evidence/runtime-closure-repair-20261111.json.gz).
The genuine isolated registration, canonical and profile freshness, strict
parity, original compiler byte bound, remaining deadlines, complete gate and
the entire current CI cycle remain required.
