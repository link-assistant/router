# Primitive Option callback translation source draft

The 36 matching native/JavaScript callback interfaces now have actual source
checking in both directions, canonical Rust projection, both independent
interpreters, typed/Rust emission and receiving runtime packaging. All of this
implementation and its independent regression source is unrun.

Forward qualification checks the real standard Option owner and payload,
actual inline closure arity, every callback body and both complete native
dependencies. Callback result layouts are captured without treating a callable
type as an aggregate. Borrow flow uses the independently checked callback
result, including captured references, rather than assuming the receiver owns
every returned reference. Source lifetime and lexical ownership walks both
visit callbacks even when their output does not borrow.

Reverse checking isolates callback result and paired-type state from its parent
function, refuses owned or mutable captures, checks all return paths and restores
actual native input/output domains. Static optional text requires an independent
literal/absence/body proof; a null root alone supplies no proof. Optional locals
receive actual native-bound TypeScript annotations to retain their tagged ABI.
Complete original sources and inverses cover twelve integration files, with
ordered language and repository rule sequences and serialized CST preparation.

Independent source cases cover actual JS and strict TS, both interpreters,
canonical Rust reproduction, separate captured lifetimes, zero/false/empty,
lazy failing fallbacks, changed native/runtime sources and forged metadata.
No case, producer or translator has run during this drafting phase. Automatic
callback method adoption, broader Result/effect families, production application
and every other unfinished ledger row remain open.
