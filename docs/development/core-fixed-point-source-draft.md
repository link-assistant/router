# Bounded source-rule composition draft

All implementation and independent case SOURCE is UNRUN. No local parser,
translator, generator, test or compiler ran and CI feedback is uninspected.
Full production translation, parity, synchronization and delivery remain open.

The original one-pass source proposal API and canonical CI commands are retained.
An additive streaming API copies its complete stage router and source/Cargo/
profile snapshots, then repeats the exact requested stage sequence for at most
four rounds. Earlier stages can consume prerequisites introduced by later ones.
Every stage must freshly produce its complete matching before/after source map;
original request inputs are rechecked before and after awaits and yields.
No stage, namespace check or declared workload is skipped or weakened.

Each stage emits its complete proposal packet, round/index and changed paths.
Only a full unchanged round issues a final stable receipt. A changed fourth
round throws and issues no complete receipt. Stability means no further selected
source substitutions, never full coverage, semantic admission, runtime parity or
reverse execution. Original unknown/refused source remains unknown/refused.
The new protocol is explicit; old packet consumers and original APIs keep their
existing schemas and cannot accept it as a verified install plan.

A collector can stream full packets to an observer while retaining only current
source strings and bounded scalar receipts. It snapshots next strings before
observation and refuses changed originals, mutated sources, dishonest before/
after associations and observer faults. It stores no across-operation source,
hash, owner, verdict or result cache and installs nothing. Four rounds are a cap
for this new opt-in API; original time, heap, disk, input and case bounds are
unchanged. Corpus performance and all actual receiving remain unqualified.

Three complete compiler equations retain language then repository phases and
full serialized/reparsed CST inverses. Independent unrun source controls cover
late prerequisites, unchanged-round receipts, refusal at the cap, stream indexes,
mutations and observer faults. The control fixture relocates two imports to the
actual guard libraries and uses explicitly nonsemantic stub adopters; a separate
real Option/text integration source uses both actual original adopters, complete
packet inverses, JavaScript/strict TypeScript and a native standard-expression
oracle. Export/source-sync facade cases are drafted without execution.

The next integration work must qualify bounded streaming and actual complete
corpus composition before selecting this API for canonical adoption/delivery.
All source/native/production/sync/freshness/parity/delivery requirements remain
OPEN, with all eight same-SHA JavaScript gates before fatal CI-only Rust intact.
