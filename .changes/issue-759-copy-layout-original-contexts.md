Retain every noninactive original module path in the layout-only Copy analysis
tree, including modules whose layouts were all refused. Type lookup keeps its
original lexical context and missing target layouts retain ordinary checked
refusals. Empty contexts supply no declarations, bodies or Copy certificates;
unknown source scopes still retain their trait and namespace obligations.
The complete canonical producer previously stopped before output writes when
lookup dereferenced an absent module. New regression fixtures reproduce that
failure in both Node and Bun. All 99 cases across the complete 12-file affected
scope now pass under both engines, including unchanged JavaScript and strict
TypeScript execution. The evidence archive retains every initial failure,
complete raw log, command and source-input manifest. Actual full-corpus
regeneration remains required after integration; no local Rust build ran.
