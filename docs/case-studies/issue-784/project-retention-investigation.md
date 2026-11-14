# Retained project callbacks

This investigation accompanies [PR #785](https://github.com/link-assistant/router/pull/785).
The ordinary current-source planner still has no completed local generation or
green matrix qualification. Its namespace-stage heap failure remains unresolved.
This later callback change does not establish a fix for that earlier failure.

## Finite observation

The original project compiler returns its repository finalizer from inside the
complete language compilation. The finalizer creates lowering and checked-source
callbacks in that enclosing environment. Holding one returned callback can retain
the source reader, progress callback, source views and derive context after the
caller discards the public result metadata.

The diagnostic uses the complete current `rust/src/config.rs`, SHA256
`9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a`,
in an explicitly limited one-file module graph with the genuine Cargo inputs. It retains
`DEFAULT_MAX_PROXY_REQUEST_BYTES`; the original compiler lowers this constant as
a zero-parameter function. That constant's checked-source accessor correctly
refuses the function-only source contract. The separate complete small module graph
exercises successful checked-source reads and mutation observations.

Four fresh Node 20 processes run sequentially with 512 MiB heaps. Each holds only
the selected lowerer or complete executable facade, then performs eight explicit
GC/event-loop observations. Weak references are diagnostic observations and are
not nondeterministic receiving-test assertions.

| Retained value | Original heap used | Candidate heap used |
| --- | ---: | ---: |
| Lowerer | 53755888 bytes | 49156584 bytes |
| Complete executable facade | 53860720 bytes | 50348624 bytes |

Both candidate observations release the source-reader, progress and derive-context
references. The lowerer also releases the source view; the complete facade keeps
it through its required source/checker inputs. These finite retained-heap values
are neither whole-process RSS nor matrix peaks. No newly executable production
function is claimed.

Every original/candidate run has the same full checked-program SHA256
`e79444a0d4602d595013be2ce24981e4f2871554834ee7a2937411b96250a279`
and emitted JavaScript SHA256
`b5f4f0f2a06e7b193dd8f592ffb2647b77c9dd9c893d4a7ab5012af77317b1df`.
Callable names, arities and complete Node function text also match. The diagnostic
candidate changes import URLs only to preserve the actual canonical private
issuers. A Node loader redirects that one canonical project module to the
temporary candidate; it does not load a second competing project issuer.

Earlier unsuccessful attempts remain retained. The first incorrectly expected a
constant semantic node rather than the original thunk. The next correctly failed
private method-source authority because a separately imported copied project
cannot issue evidence for the canonical module. Neither original refusal was
changed. The final comparison preserves the same original issuers.

## Source equation

`prepare-project-facade-retention.mjs` archives and pins the complete 68243-byte
original project source, SHA256
`6d4f79faba62027fa5d3d1b733d99e309a5ae3981f6043bea4842cc58b75d7a0`.
Installed TypeScript 5.9.3 selects exactly the original lowerer and checked-source
arrow. The language phase replaces their construction sites; the repository
phase appends two private module-level factories. Both returned function bodies
remain byte exact in source. Names and descriptors match the original under
both receiving engines. Bun prints different indentation after factory placement;
the engine comparison checks every parsed native syntax node. Node additionally
requires exact runtime function text. No exact Bun text identity is claimed.

The lowerer retains its original target and declaration entry. The checked-source
factory retains the original checker, entry and complete live module array through
a minimal private carrier. It does not snapshot a selected module or a prior
verdict. Path aliasing, ambiguous module matches, source hashes, original parsed
evidence and fresh frozen result copies retain their original behavior.

Each phase applies a complete CST substitution, serializes and reparses it, and
executes a complete inverse. Independent detached native AST copies preserve
structural equality; the receiving lexical-binding check reports no unbound
identifiers. These are source equations, not type or executable authority.
The original/current physical source is re-read at the final boundary. The
installed afterimage has SHA256
`4ad5fc9d1ead75c083d61026468b1577ecd0815338abaaa9a27cc10f0649d960`.

The current-source composers append this layer after their existing exact
predecessor. Their historical source archives, source pins and earlier layers
remain intact. Prefix layer counts are still checked, and the new final schema
is checked separately. No historical output is accepted as current generation.

## Verification boundaries

The complete source producer passes under Node 20.20.2 in 11.59 seconds, retaining
its entire 7012018-byte logical receipt. Its own write operation installs the
first derived source in 10.97 seconds. The final name-preserving write takes
11.81 seconds. A separate final-source capture passes in 14.72 seconds and its
full 7013205-byte receipt is reopened and decoded. The compressed SHA256 is
`1f37f5b111648c3d341033c2f114f7c99d07c1c6969e8f7bb8e3f50cec4533a4`;
its complete afterimage matches the installed production source. The final
finite four-process comparison takes
64.00 seconds and samples a total-cgroup maximum of 1417990144 bytes; this is a
diagnostic elapsed interval, not a receiving case with a 60-second declaration.

The first four-file Node receiving attempt completed with 11 TAP passes and
3 failures in 729.54 seconds. One new mutation assertion incorrectly expected
the original shared path to be rejected; two strict fixture cases lacked the
installed compiler on PATH. The original source-composition cases exceed their
unchanged 60000 ms limits, including 247572.206544 ms for checked-source composition.
This first attempt has no independent deadline audit and is not a qualified pass.

The five-file Bun attempt completed with 14 passes and 7 failures in 695.98
seconds, without a memory stop (2642653184-byte sampled total-cgroup maximum).
Two new assertions incorrectly assumed Node's function formatting and name
inference. The original composition cases exceed 60000 ms; three also refuse
the actual TypeScript `Debug.shouldLog` source pin. The original upstream-header
fixture differs from current physical source. These failures remain retained.

After correcting the new assertions and preserving the checked-source name
through an actual object property, all three new cases pass on Node 20.20.2
with the independent deadline audit (`complete-KHyh8Y`), and on Bun 1.4.4.
The audited Node attempt takes 36.63 seconds with no case breach; Bun takes
32.65 seconds. The whole original receiving cohorts remain unqualified.

Raw logs and complete child receipts are retained under
`ci-logs/issue-784-restart-2/`, including unsuccessful harness variants.
No passing full gate, current matrix, strict parity or Rust execution is
established by these observations.
