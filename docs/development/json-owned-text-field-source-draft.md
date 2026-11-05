# Owned JSON text field source draft

All implementation and independent case SOURCE remains UNRUN. Full translation,
coverage, parity, synchronization, freshness and receiving qualification remain
unfinished. No local test, parser, translator, preparer, generator or compiler
was executed, and CI feedback was not inspected.

Eight interfaces copy the actual borrowed JSON string reader/default functions
for path depths one through four, retaining all45 current field interfaces.
General substitutions remove the output/input lifetime coupling, select actual
owned String or Option<String> results and copy the existing read expression
through native str::to_owned. Repository substitutions rename the actual native
function tokens. All original readers remain unchanged and every preceding
native source history retains its complete immutable original and CST inverse.

JavaScript reuses the original reader expressions and immutable primitive string
representation. Some("") remains present; missing/null/wrong-kind remains None or
empty default. These interfaces retain the canonical JSON string domain and the
native standard ownership copy; bounded text operations keep their own separate
limits. Full source/type checks give the new operation its owning result, and no
public string shape or source hash grants ownership. String/Option<String>
results may therefore leave local JSON storage when those checks succeed.

Both original adopters select only canonical string readers followed by
str::to_owned/str::to_string or a closed matching one-argument copy callback.
Matching map/unwrap_or_default and borrowed empty-default/to_owned/to_string
forms use the owning empty-default interface. Other mappers and eager fallback
expressions remain in their original source positions. Broader String::from,
generic trait, filter and closure forms remain separate obligations.

Forward rules produce actual owned standard String types. Both reverse lanes
reuse their existing owning result domains, while the resource lane retains all
local/multi-root loan restrictions for the original borrowed interfaces. Shared
source call/text rules derive current owning result roles without saved owner,
source, hash, verdict or execution caches. Eleven complete JS/TS equations plus
eight native function copies retain language then repository phases and full
serialized/reparsed CST histories.

Independent unrun source covers all8 ABI forms, empty/Unicode/large JSON strings,
missing/wrong-kind/Some-empty, noncoercion,24 actual caller forms across both
adopters, fixed bulk JS/strict TS emission, both reverse lanes and interpreters,
full native inverses, results outliving local receivers, complete45-interface
joins and exports. Native oracle source independently compares standard copy
expressions and receiver-independent lifetimes. Every wider ledger requirement
remains open; all eight same-SHA JavaScript gates before fatal CI-only Rust stay
unchanged.
