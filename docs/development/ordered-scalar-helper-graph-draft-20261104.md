# Native helper module and call graph draft

This extends the [adopted ordered helper lane](ordered-scalar-helper-adoption-20261104.md)
with complete reader source proposals for named inter-helper imports and actual
same-module function symbols. Both readers are now [source adopted](ordered-helper-graph-adoption-20261104.md). All
execution is UNRUN, CI NOT_INSPECTED, counts12/70 DRAFTED,58 OPEN and actual
production coverage UNKNOWN. The installed source graph now retains466/275.

## Separate import layout from executable body proof

The original private reader still owns the real TypeScript Program/checker,
source/file identity, actual import symbols, unique native declarations and
whole function bodies. The new graph helper supplies structural orchestration
only. Public callbacks, fake nodes, flags, exported names, returned Maps and
source hashes do not issue parser/type/body/namespace permission.

A fresh graph operation builds ordinary function/import layouts using the actual
native syntax and complete source. It registers a layout before resolving its
imports, then drains a FIFO worklist through the original import checker. This
allows benign import cycles without recursively expanding the layout traversal.
Every reachable ordinary module is checked for top-level effects, unsupported
imports/modifiers and duplicate functions, including unused imported modules.
Named reexport handling keeps the original native resolver and its32-hop bound.
Canonical type imports still require their actual native scalar declarations;
value imports require an actual ordinary helper function or one of the six
canonical primitive operation bindings. Nothing is admitted by spelling alone.

The native wrapper checks its genuine private handle/state, actual syntax-map
file pointer and complete source identity. The final imported function must be
the unique declaration of the original aliased symbol and the exact ordinary
exported function node. A same-module call must instead be the actual unique
native top-level FunctionDeclaration symbol and exact function-layout pointer.
Parameters/locals with the same name cannot impersonate that declaration.
Nonexported ordinary scalar definitions remain present in the translated module.
Written scalar return roles are requalified for this private lane's literal
entrypoints using the original type/declaration checker. Old helper APIs retain
their original source domains and failure ordering.

Bodies are checked freshly at every actual call, after binding qualification.
An invocation-local native declaration stack refuses recursive or too-deep body
calls before uncontrolled recursive compilation. Its entries are removed in
finally even after failures. Sequential calls and benign import cycles remain
separate from recursive body execution. There is no positive checked-body or
verdict cache. Layout metadata and callbacks are cleared when the graph closes;
no source, owner, body verdict, result or permission cache crosses operations.

## Provenance, failure and resource boundaries

Nested primitive receipts keep their original helper source instead of being
relabelled as an outer helper. Native operator history similarly retains its
innermost helper origin. Transitive original helper receipts are retained with
actual caller locations, full source declarations and original import ancestry,
so the existing document machinery includes the required helper CST sources.
These records are bookkeeping; the complete source/native/meta checker still
independently reconstructs and qualifies every emitted function.

The worklist retains4096modules/100000cells; native body call depth retains160.
Current-source checks and the original native resolver run throughout the fresh
operation. Caught native/import/current failures poison subsequent selection
and closing with exact falsy/frozen primary identity. All closing checks and
cleanup still run. Synchronous callback requirements reject asynchronous work.
The implementation does not import or execute source modules to inspect them.
Graph traversal is iterative and bounded; no performance gain has been measured.

Both reader proposals select a new seven-input ordered archive, retaining the
old six inputs and adding the complete graph helper. The old six-input archive,
old fourteen-input Copy archive and original Boolean archive stay immutable.
The graph archive remains nested inside those existing Copy/Boolean guards.
Full original reader before/after images, separate language/repository counted
substitutions, intermediate whole CST serialization/reparse and exact inverses
are retained. Source roles and compiler facts still require the original private
checks; source identities alone grant no permission.

## Independent source cases and remaining work

Unrun structural cases cover cyclic layouts, fresh operations, current-source
closing, exact caught/falsy primaries, expired frames, competing file paths,
4096/4097-module boundaries, iterative chains and asynchronous refusal. These
fake-token cases deliberately do not certify native ASTs or compiler authority.
Native receiving source drafts both original readers with a three-module helper
chain, full transitive source origins and independent meta reissuance, actual
same-file functions, benign import cycles, recursive body refusal, unused module
effects and parameter shadowing. Old Copy-helper refusal remains a case.

Complete two-reader/two-creation packet
SHAa9cb390d61dff0c5088a1ea2f83e3648b3e8d965eebafe2ae4a13f7da0cb6679,
189808compressed bytes. Seven-input archive
SHA17de382051744162b2e88ab82c4172eb08b3188aa255350c78ddbcb69f84598f.
Proposed original readers remain928/862lines, below the1000-line policy.
Both exact reader successors and receiving source now have appended complete
history preserving all451 previous equations. Qualification remains unrun. Recursive function emission,
wider owner/effect/interface and module forms, actual application adoption and
all other remaining acceptance clauses stay open. This increment closes no row.
