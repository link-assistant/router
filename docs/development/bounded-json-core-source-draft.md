# Bounded native canonical JSON library source draft

SOURCE ONLY; every implementation and case is UNRUN. No parser, translator,
preparer, planner/installer, tests, experiments or compiler ran. CI feedback is
uninspected. Full source drafting and every delivery obligation remain OPEN.

A separate native translation_json_core module drafts JSON validation/copy with
the same root-inclusive 4096 Value-node, depth32 and dense4096 envelope as the
existing defensive immutable JavaScript JSON adapter. Map keys do not add Value
nodes. Native serde_json scalar invariants and the separately checked canonical
layout/profile remain prerequisites for callers. Existing json_copy APIs keep
their current contracts; the new native helper does not remove input guards.

json_validate checks the complete native envelope before returning unit;
json_checked_copy validates before allocating independent owned storage.
json_checked_with_field validates both inputs and the complete combined output,
retaining object/null and key semantics through the existing core update. New
JavaScript runtime exports reuse json_macro_value for the same defensive field,
scalar, key-order, proxy/accessor, cycle and resource validation. This first
library batch does not register parser/caller operations or enable JSON native
source synchronization; those requirements remain OPEN.

Five complete compiler equations preserve language then repository rules and
full source/CST inverses. The actual Rust root receives one complete native
history successor, retaining all prior originals and pins. The default native
history now contains 18 steps across 16 paths; the new native helper is a
separate complete pinned source input. Both preparation roots retain the whole
source family. Literal native source data and its hash grant no namespace, type,
caller or executable authority.

Independent unrun source covers canonical nested copies, existing export parity,
root-inclusive node/depth boundaries, invalid scalar/tag/key layouts, input
accessors/proxies, helper/root source bytes and full history/inverse records.
The independent native value/buffer/boundary oracle remains CI-only after all
eight same-SHA JavaScript gates. No Rust tool ran locally.

Actual original parser/caller registration, private canonical layout joins,
validation of every JSON input including empty branches, exact native JSON tree
reproduction, full module/unit synchronization, complete namespace/caller
coverage and receiving/race/platform/performance/CI qualification remain OPEN.
This source library is not executable coverage or verified runtime parity.
