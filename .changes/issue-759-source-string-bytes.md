Drafted actual borrowed str UTF8 Bytes with source-qualified by-value u8 items
through the common Rust → checked semantic meta → JavaScript/TypeScript pipeline.
Reused the full original Rust core str sources and retained exact method/Item
anchors, compressed/source/Git-blob identities and incomplete authority flags.
Original caller bodies, loops, scalar adapters and callbacks remain automated.

Initial paired checks passed 188 of 192 cases in both engines, including all
184 prior regressions. Four new failures exposed cooked byte-character parsing.
Added the pinned Rust parser's actually locked literal escaper grammar bridge,
two byte-domain/proof cases and a reserved global source-name control. Expanded
24-file repair checks passed 202/209 in both engines; six failures exposed a
raw-number versus checked-literal proof mismatch, and one fixture expected a
reserved source declaration to be accepted. The coherent correction preserves
that refusal and validates checked literals. The next paired checks passed
208/209 in both engines; the one remaining authored fixture expected the
wrong panic message. Corrected it to assert the actual RangeError name and
exact divide-by-zero message. Final 24-file checks pass all 209 cases under
Node and Bun, including JavaScript execution and strict TypeScript targets.
Retained all four complete pairs, failed attempts, source manifests and bounded
harnesses in the source-string-bytes-74aab6e1 evidence archive.
The standard UTF8 primitive bridge is source-inferred lowering; complete core
library translation, stored cursors, owned/custom Deref, reverse consumption,
const execution, corpus gain and full runtime parity remain unproved.
