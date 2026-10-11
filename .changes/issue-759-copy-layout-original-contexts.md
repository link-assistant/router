Retain every noninactive original module path in the layout-only Copy analysis
tree, including modules whose layouts were all refused. Type lookup keeps its
original lexical context and missing target layouts retain ordinary checked
refusals. Empty contexts supply no declarations, bodies or Copy certificates;
unknown source scopes still retain their trait and namespace obligations.
The complete canonical producer previously stopped before output writes when
lookup dereferenced an absent module. New regression fixtures reproduce that
failure in both Node and Bun and retain all initial failure logs. Verification
of the repaired complete affected scope is pending; no local Rust build ran.
