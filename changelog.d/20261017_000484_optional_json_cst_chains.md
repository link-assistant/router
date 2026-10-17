Broaden the optional canonical JSON proposal selector to retain a complete
balanced original argument, including comments and a unary trailing comma,
while refusing multiple arguments and trivia that a replacement would delete.
The old complete comment-in-argument fixture now verifies lossless forward and
inverse adoption; all other previous refusal controls remain.

A separate language/repository CST pass gives complete tail method chains a
hygienic immutable Json root when their parse input is an existing borrowed
parameter. It retains the entire suffix and early-exit order, plus original,
intermediate and final source/CST/mappings/inverses. Arbitrary argument owners
are not hoisted across a new let semicolon. No runtime, Host, flow, lifetime,
private issuer, generic serde or source-data registration changes are included.

The existing whole-eight test keeps its workloads and deadlines, adds balanced
argument/arity/hygiene controls and complete original/current parents for
`json_string` and `root_id`, and authors independent JavaScript/strict TypeScript
outcomes for their full bodies. Those target assertions require the separate
source-bound Option<String> flow support. All receiving is UNRUN in this
source-only batch; source proposals do not establish executable coverage,
runtime equivalence or reverse synchronization.
