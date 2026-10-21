Regenerate ordinary native reverse artifacts from the physical `js/src`
layout. The actual producer emitted 396 outputs and changed 209 artifacts;
full input/output byte comparisons, changed source CSTs and inverses preceded
installation. Fresh ordinary reverse checking and strict compilation of all
164 native TypeScript files pass. The new Rust base64 witness remains
uncompiled locally.

Preserve immutable baseline data and names while mapping receiving lookups to
the physical files. Select fixture import/export relocation by exact syntax
spans, retaining duplicate sites and embedded source strings independently.
Both complete affected files pass Node and Bun, including the new duplicate
specifier regression. Full physical-project performance, owned/profile
freshness and full parity remain open.
