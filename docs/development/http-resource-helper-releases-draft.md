# Complete helper input-release source summaries

All new implementation, receiving and native case source remains unrun.

The complete flow checker now records actual mutable resource input disposition
at every original terminal exit, including Result errors, Option absence and
terminal branches. Resource-state records consume the existing source-cell
budget. The helper descriptor independently joins every exit for each exclusive
input. Only agreement across all exits may declare an input always released.
Mixed available/disposed exits retain an explicit outcome-sensitive obligation.

At a qualified local call, each proven release must bind the corresponding real
exclusive caller argument. Its state becomes disposed only after that whole
call completes; future calls retain the original cold/immediate-await boundary.
This permits local owned-resource cleanup through helpers without treating a
possible release as unconditional. Aliased exclusive arguments, reuse after
release and incomplete summaries refuse. Helpers with unit returns may also
supply explicit complete Result/Option error cleanup.

The canonical native inverse may propose local cleanup calls, but this proposal
supplies no effect authority. It must reproduce the entire source through fresh
callee and caller checking. Serialized exit metadata is reissued from original
source and cannot grant a release. No cross-invocation source/effect cache is
introduced. Complete original flow/summary/projection sources, ordered native
substitutions and full CST inverses are retained.

Independent source cases cover direct and nested cleanup, all original error
exits, repeated client creation/cloning/release, partial release, exclusive
argument aliasing, reuse, forged exit states, complete canonical native
reproduction and actual JS plus independent strict TS. A handwritten native
oracle is reserved for JavaScript-gated CI. The previous unconditional helper
refusal now has positive cases; its partial-release obligation remains explicit.

Outcome-sensitive partial releases, multiple returned roots, recursion,
generics/methods, broader mutation/loop/async domains, namespace/bootstrap,
production adoption/parity and every unfinished requirement remain open.
No translator, preparer, installer or test was run.
