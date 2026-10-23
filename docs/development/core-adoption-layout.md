# Physical Rust layout in the bulk-adoption workflow

The four existing Python runtime files share the same operational Rust package
selection as the JavaScript layout helper: a flat src tree or rust/src, with
the actual package manifest and root workspace or package lock. Every tracked
Rust source and nested Cargo manifest/lock remains in the before/after guard
universe. Logical fixture CORE declarations remain unchanged; intersections
with actual source edits use physical paths.

Prepare the complete batch with prepare-core-adoption-layout.py. It uses native
Python AST selections and ordered language/repository substitutions, retaining
whole token/trivia CST documents serialized and reparsed at both stages, exact
UTF8 byte spans and complete inverses. Existing bounds and the four-file runtime
closure remain. The CST extension grants no namespace or executable authority.

All nine complete receiving cases pass under Node 20.19.4 and Bun 1.4.3 with
their original deadlines. They independently compare Python and JavaScript
layout selection, nested Cargo guards, linked-path refusals, bare CLI diagnostics and complete CST
inverses. The actual proposal/review/application/recovery workflow, adoption
output, fresh exports and full CI still need qualification; path checks do not
establish production coverage or complete synchronization. The operational
helper loads after argument validation; an invalid or foreign CLI selection
still reports its original error without the rest of the runtime installed.
No Rust ran locally.

Both controllers count evidence with a fresh native directory walk at every
original accounting point. The original sparse logical sizes, allocated blocks,
directory and link counts, special-file refusals and entry limits remain.
Independent comparisons include the complete installed TypeScript tree.
No size or verdict is cached between scans. Profiling the first ten seconds of
a complete controller diagnostic identified repeated accounting as a hotspot;
this observation does not establish an end-to-end speed gain or qualify the
original twenty-second workflow child deadline.
