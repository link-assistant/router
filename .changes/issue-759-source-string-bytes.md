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
that refusal and validates checked literals. Its 209-case retry remains UNRUN.
The standard UTF8 primitive bridge is source-inferred lowering; complete core
library translation, stored cursors, owned/custom Deref, reverse consumption,
const execution, corpus gain and full runtime parity remain unproved.
