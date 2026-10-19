JavaScript ordinary function completion and bare return statements now lower to
explicit undefined in checked portable IR. Original-source ASI preserves
comments and ECMAScript line terminators; nonundefined return contracts,
unsupported effects and asynchronous bodies retain their refusals.

The complete 52-module inventories retain 73 translated top-level declarations
out of 788. The separate 705-body scoped inventory has 52 full-domain drafts and
nine conditional private drafts, including 18 newly admitted original
synchronous empty callbacks. Two asynchronous empty callbacks and all enclosing
refused owners remain refused. Original JavaScript, IR and strict TypeScript
behavior is checked in Node and Bun; generated Rust remains uncompiled.
