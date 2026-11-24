Actual borrowed str UTF8 Bytes and cooked byte literal source translation
passed 209/209 cases under both Node 20.19.4 and Bun 1.4.3 at
`74aab6e1881348f61ad721f8e89ecf104bf483fb`. The 24-file suite executes original
Rust callers through checked semantic meta, JavaScript and strictly compiled
TypeScript. It includes ten new byte cases and 199 earlier source, numeric,
iterator, ownership and pattern regressions. Node took 75.186 seconds and Bun
55.702 seconds, each within the unchanged 360-second bound. Neither skipped
tests or timed out; Node reported zero cancellations. Bun exposes no separate
cancellation count. All 1,485 input hashes and the tested head were unchanged.

The lossless archive retains all four complete paired attempts, all eight raw
logs and receipts, all eight input manifests, both immutable bounded harnesses,
the three full failure inventories, the authorized build-directory scan and
the actual archive builder. Earlier results were 188/192, 202/209 and 208/209
under each engine. Failures exposed cooked byte parsing, raw-versus-checked
literal proof staging, an incorrect reserved-name acceptance fixture and an
incorrect panic-text expectation. The final change corrects only that panic
assertion; it preserves the original Rust body and compiler behavior.

`router-759-string-bytes-74aab6e1.tar.xz` contains 31 logical members, including
four deduplicated hardlinks, and reopens with zero length or SHA256 errors.
The adjacent receipt records every member's original path, complete digest,
attempt counts, source head, input digest, command and resource limitations.
Archive SHA256: `5bf876af74ecde85d8097acaa4654f55adb02fbb0d323fc47b580fd03862df69`.

The standard UTF8 bridge is source-inferred lowering with full original core
sources and exact method/Item anchors. The cooked byte grammar bridge retains
the actual Rust parser and its Cargo-locked literal escaper source. These are
bounded primitives used by the automatic caller compiler; complete core/str
translation, stored or reverse cursors, custom Deref, owned receiver movement,
const byte iteration and complete trait or namespace resolution remain
unproved. No corpus producer, full parity gate or Rust build ran in this cycle,
and no new corpus admission or complete runtime parity is claimed. RSS is
RUSAGE_CHILDREN maximum for a terminated child, not aggregate process-tree
peak or footprint.
The XZ wrapper preserves the exact original tar bytes and all 31 member hashes.
The previous gzip bytes and receipt remain in Git history; the receipt records
that compression history. This changes storage only and saves 1,443,133 bytes.
