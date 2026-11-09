# Private inference reuse during native regeneration

Native TypeScript regeneration keeps one private TypeScript inference program
for an unchanged source root. The public parser and `buildNativeTypeScript`
continue to create fresh programs. Neither public route can obtain the private
program, checker or syntax nodes retained by regeneration.

Before reusing inference, regeneration creates a fresh compiler host and checks
the complete observations made by the previous host. These include file reads,
positive and negative existence probes, directories, package resolution,
realpaths and environment queries. Every loaded source and declaration text is
also compared in full. The root, ordered input list, compiler options, working
directory, default library path and compiler function identities must match.
Changed input, inconsistent observations or an observation budget overflow
disables reuse. A fresh program then follows the existing compiler path.

This optimization retains inference only. Every regeneration still transports
the complete JavaScript sources through native CST serialization and reparsing,
serializes and reparses checked meta, emits TypeScript, and independently checks
the erased runtime AST. It also reads package metadata and assets afresh. An
eligible retained program's inputs are checked again before accepting outputs;
an uncacheable program follows the original fresh-program path. Generated files and
previous freshness verdicts are never reused as evidence.

Private serialization avoids allocating empty gap/child containers and querying
symbols for syntax that cannot carry the original identifier flags. Complete
metadata is compared with the unchanged public serializer in receiving tests;
the production generator still compares emitted and original runtime syntax.

The private generator packs at most 64 rows and 262,144 UTF16 units per group,
while allowing an individually valid larger source its own group. These are
packing hints within the unchanged native per-source and aggregate limits.
Only the exact native aggregate-node/canonical-budget refusal can split a group;
the failed transaction is discarded and both complete halves cross fresh native
transport. A single-row failure and every other error still propagate. Every
complete physical source is reread before use and after semantic consumers.

The host observations are a boundary for the stock, synchronous generation
workflow. They do not provide an atomic filesystem snapshot, protection against
hostile compiler or filesystem callbacks, or type/ownership authority for a
different compiler. Runtime syntax comparison remains a separate check.

The dedicated receiving file exercises actual regeneration with changed external
declarations, a previously missing dependency, changed and added JavaScript, and
exact Unicode/CRLF asset bytes. These cases supplement the unchanged complete
native TypeScript receiving file and its original deadlines; passing the small
fixtures alone does not qualify that file or the complete JavaScript gate.
Packing controls include more than 64 sources, a whole source exceeding the
packing hint, exact Unicode/CRLF bytes and dense sources that exceed the native
aggregate limit together while each remains valid separately.
