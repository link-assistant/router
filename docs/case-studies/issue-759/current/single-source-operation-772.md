# Shared bounded source operation and original deadline results

This continues #759/#772 after
`e95b581d8d8d438f0c23b0ff80f01c17f9c68350`. The
[complete evidence index](../raw/continuation-772/20261023-single-source-operation/index.json)
retains source proposals/reviews, the intermediate binding-collision refusal,
five-file regeneration, complete local output and original deadline/resource
receipts. Each compressed entry has a complete-byte hash and readback check.

The [source-operation contract](../../../development/single-source-rule-operation.md)
uses the existing language/repository runtime once per complete source, with
three independently reconstructed full canonical wires and the original path
for larger inputs. Both source-planning paths share that language engine;
the comparison checks orchestration rather than independent compiler engines.
Independent generic CST operations and the real large-source fallback remain
covered. No limit is raised and no new cache spans invocations.

The initial direct import hit the existing batch generator's reserved-binding
guard. A reexport adapter fixes the collision; the guard is unchanged. The
actual producer regenerated all five dependent files through complete native/CST
source equations and inverses. The parked shared-TypeScript scheduling profile
remains disabled and unqualified.

All **28 cases across six complete files pass Node** at their original limits.
The full-plan comparison takes 59,026.915 ms and the repeated-plan case
58,060.445 ms against their unchanged 60,000 ms deadlines. The complete run
takes 267.787 seconds with 896,565,248 bytes peak aggregate RSS.

Bun passes all functional assertions, including the large-source fallback,
but the repeated-plan case takes **78,029.8 ms against 60,000 ms**. Its run is
therefore **red**: 349.136 seconds and 1,494,450,176 bytes peak aggregate RSS.
The timing observations are not controlled benchmarks. Node's narrow deadline
margin does not qualify CI performance, and Bun's failure remains open.

Current compiler fixtures, complete generation/profile outputs, strict target
TypeScript, reverse/export freshness, application parity and the complete
same-SHA JavaScript gate still require verification and repairs. The separately
qualified 40-case native-constructor batch establishes no new application
coverage. No local Rust tool ran; Rust CI remains gated on fully passing
JavaScript for the same immutable SHA.
