# Owned loop control source draft

The owned-outcome profile now drafts ordinary Boolean while blocks, unlabeled
break/continue in the actual current function's loops, and mutable primitive
Boolean/integer/owned-text locals. Existing domain, assignment, symbol, input
and paired TypeScript joins remain required. List loops retain their once-only
canonical snapshot, and every loop exit propagates the correct completion.
Callbacks start a separate loop context; labels and jumps across functions refuse.

Mutable Option/Result facts are cleared both at loop entry and after every loop.
This covers zero iterations, repeated iterations, early break and continue paths
without assuming that a first-iteration tag remains true. Each iteration has its
own lexical scope, and only actual outer bindings are copied back by the two
independent interpreters. Canonical Rust source reading and complete inverse
reproduction include the same while/control syntax. The finite source and
depth guards are unchanged; general loops may naturally diverge in every target.

Six complete source predecessors, language/repository rules and full CST inverses
compose the earlier loop and filesystem producers. Independent JS, strict TS,
both interpreters, Rust inverse, ownership/refusal and native oracle sources are
drafted. **No checks, translators, experiments or Rust tools were executed.**
General arithmetic/range loops, records/classes/generic application types,
HTTP/streaming/state and all other bulk rows still require their remaining draft.
