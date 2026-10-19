Extended the isolated source→IR arithmetic model to actual original slice,
tuple/reference loop, iterator, while/else and compound-assignment syntax.
Mechanically selects13 original lexical functions including long_mul and its
carry/normalization dependencies. Added2 original-product/carry and1 generic
ambiguity/tuple cases, all UNRUN. Compiler-issued IR is serialized/reparsed
privately before sealing; duplicate selected owners refuse. Runtime model
closure is not source owner, pointer, borrow/Drop, power-dispatch or application
effect certification. The actual parser guard and admission flags remain false.
