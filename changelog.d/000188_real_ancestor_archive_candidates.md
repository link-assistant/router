Added a reusable, explicitly unverified archive-candidate builder. It validates
complete existing packet inventories and compares every source archive byte to
its stored Git blob, then creates real D/I ancestor commits on a fresh private
ref. The final candidate tree changes only the bounded packet index; the current
checkout, real index, case files and all original archives stay unchanged. Real
configured Git identities and actual timestamps are retained with full command,
source and readback receipts.

Sixteen small synthetic-repository Python controls and the automatically
discovered complete two-case Node/Bun wrapper are source only and UNRUN. They
cover source/index isolation, exact recovery through the unchanged packet reader,
identity, namespace, stale-source, foreign-history and deadline failures. Full
historical 4,853/1,971-member recovery, shallow-receiver continuity, three CI and
three measurement reads, fixed-500-MB allocation, adoption and retirement remain
pending. No source corpus, failed capture or raw original has been removed, and
there is no semantic, Rust or publication qualification.
