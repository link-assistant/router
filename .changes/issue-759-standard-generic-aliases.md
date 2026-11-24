Resolve standard Option and Result owners through registered namespace evidence, including qualified types, aliased imports, public constructor imports and source reexports. Checked constructors and patterns require the actual matching monomorphic standard layout. Local owners, unknown glob scopes and mismatched generic layouts retain explicit refusals; actual source functions named Some keep their original behavior.

Quoted pattern literals remain literal values even when their text matches a standard constructor name in an unresolved scope.
