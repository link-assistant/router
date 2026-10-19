Complete focused conditional-attribute and Copy-provenance verification

The [receipt](receipt.json.gz) records all four attempts and the fifteen byte-verified
members in the [complete archive](cycle-16-conditional-copy.tar.gz). Initial Node
and Bun runs each reported eight passing tests and twenty-nine loader failures
because the new delimiter map lacked a closing quote. After that one-character
repair, all 246 tests across thirty affected files passed in each engine with
zero failures or skips at source head
`0ccaa4a922c5f774f1eb11cb9e76ae40da5c8d7a`. Node elapsed 53.030 seconds; Bun
elapsed 34.364 seconds. The source input manifest contains 1,350 original Rust,
Cargo and compiler inputs, unchanged throughout each attempt. The repaired
manifest SHA256 is
`fddbcc1fde797cc86b97be768d88c5780045383ab4ea38244cad2d0cfdb4e016`.

Coverage includes twelve new original conditional-attribute cases, JavaScript
and strict TypeScript runtime fixtures, whole production source pins, private
absence and inert-lint evidence, unknown configuration predicates, conservative
Copy fallback refusals and resolved macro subnamespaces, module and namespace
composition, derive/tool ownership, source spans/lifetimes and the actual locked
JSON parser capability guard. Original source bodies were not reproduced.

This is a focused pass, not the complete JavaScript gate. No canonical or
profile corpus producer, Rust build or producer benchmark ran in this scope;
no strict parity gap was declared closed. RSS values in the receipt cover all
terminated harness children including Git and version queries, and do not
measure a process-tree peak or peak physical footprint.
