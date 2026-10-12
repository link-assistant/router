Repair the first complete derive output cohort without changing namespace or
runtime authority. AST constructor extraction now reads actual function-body
recipes, excluding the adjacent return-type/body pair. Source function inventory
includes real methods inside original impls, never generated quoted methods;
SerializeStruct selects its actual trait branch rather than identical quotes
elsewhere. Source-template predicates require exact original normalized group
syntax and retain unique-match refusal. Attribute regressions now write the
serde helper whose owner is in question, with an unused-name positive control.

The original CatalogRecord Deserialize impl measured 368,373 serialized syntax
metadata bytes and 4,641 cells. Bound metadata independently at 524,288 bytes;
keep token spelling/delimiters at 256,000 bytes, 16,000 cells/depth64 and all
source/member/field/leaf/sequence bounds unchanged. Retain complete source spans,
syntax, provenance and digests. Add separate token/metadata/cell/depth refusals.
Explicit 60s case deadlines retain complete-source namespace assertions that
exceeded Bun's default 5s. Final paired source receipts are recorded separately;
initial102 was86/16 Node and85/17 Bun, retry1 was100/2 both. No generated traits,
automatic project/bulk activation, producer or Rust execution is admitted.
