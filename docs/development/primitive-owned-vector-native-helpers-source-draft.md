# Native owned vector helper graph source draft

Status: SOURCE DRAFT ONLY. All receiving, JavaScript, strict TypeScript,
freshness, native oracle and performance execution remains UNRUN. No CI
feedback was inspected. Full translation and synchronization remain OPEN.

The new lane follows same-module helper calls returning actual owned primitive
vectors. It retains the existing completed original declaration records,
current caller/callee joins, complete parameter/return/body snapshots and
private host operation membership. The original readonly-scalar helper API
and its refusals are unchanged. Public syntax/type candidates only select work;
they do not qualify a callee or grant executable authority.

The flow evaluates arguments in order, admits exact Copy primitives or actual
shared primitive slices, and recursively walks each complete callee body.
Graphs are acyclic, at most 32 frames and 128 calls. Results may not retain a
source loan. Every dependency is rejoined after the walk and its detached
snapshot participates in the existing emission checks. No new cross-operation
source, owner, verdict or result cache is introduced.

The initial helper contract constructs and returns owned vectors, permitting
build/count/get callers and slice-copy wrappers to reuse those helpers. It
continues to refuse owned/shared Vec parameters, mutation, callback captures,
foreign-module calls and unsupported vector constructors. Those broader
boundaries remain separate unfinished requirements. The paired core's explicit
4,096-value resource contract is unchanged.

Independent source cases span eleven domains and both emitted targets, nested
helpers, shared-slice copies, source extrema, moved storage, recursion, foreign
modules, owned inputs and unsupported constructors. Four complete source
substitution equations preserve frozen originals, both ordered phases and
whole inverses through the CST extension to meta-language. These case sources
are obligations, not passing evidence.
