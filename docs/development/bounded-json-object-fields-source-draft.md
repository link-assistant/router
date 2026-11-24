# Shared bulk canonical JSON object source draft

SOURCE ONLY. Implementation, independent script cases, native oracles and source
equations are UNRUN. CI remains uninspected; full drafting/delivery remain OPEN.

A bulk constructor accepts shared canonical JSON keys and an owned JSON value
vector. Both languages validate the complete keys and values before field layout,
require one distinct string key per value, construct the map and check its final
canonical envelope. Native code inserts fields once instead of repeatedly copying
the growing object. It moves owned values without cloning the whole accumulated
object. JavaScript uses the existing defensive canonical decoder/constructor.

This keeps the original valid domain: a 4095-field null-valued object has 4096
Value nodes, as does each separate key/value validation array. Keys do not add
Value nodes to the object. There is no combined key/value vector imposing an
artificial 2048-field ceiling. Original canonical Unicode and UTF8 map ordering,
node/depth/descriptor bounds and separate result storage remain in force.

Qualified callers retain complete original module/view/feature/source joins,
private source issuance, canonical JSON ABI and whole-function linear flow.
Shared keys remain borrowed; each owned value vector is consumed once. Public
metadata, contract records and source history grant no semantic authority.
Eight complete compiler equations and a second JSON helper history successor
retain all previous original bytes and pins. The default native history now has
20 steps across 17 paths. Native helper histories include both complete steps.

Independent source cases draft caller ownership, Unicode ordering, copied result
storage, the 4095-field boundary, wrong key kind/arity, duplicate keys, deep values
and full source inverses. A separate native oracle stays CI-only behind eight
same-SHA JavaScript gates. Reverse constructor emission/ordered comparison,
complete generated-module synchronization and all broader requirements stay OPEN.
