# Separate Node 20.20.2 whole-owner profile

The original whole-owner native crypto guard recognizes only the complete
official Node 20.19.4 function sources. Node 20.20.2, used by the current CI
runner, changes the actual `Hash` constructor. Its complete pinned function
source must have a separate profile; changing the accepted version while
reusing the old constructor bytes cannot qualify that runtime.

`prepare-attribute-owner-node-profile.mjs` retains the entire original guard,
its SHA-256, every old official source and both old license hashes. It extracts
all seven complete current native wrapper functions from separately pinned
official Node 20.20.2 source with the lockfile TypeScript 5.9.3 parser. Its two
explicit ordered rule sequences retain complete serialized/reparsed CST
documents, whole source inverses and independent native binding checks.

The installed guard selects only the exact version's complete source profile.
All original descriptor, identity, prototype, private native-handle, intrinsic
and empty-input SHA-256 checks remain required before an operation and at its
final boundary. Unknown versions and observed wrappers still use the original
creator. This does not alter a private source issuer or supply executable
application authority. The trusted common-bootstrap limitation remains the
same as the original profile's limitation.

The finite pre-integration experiment on Node 20.20.2 observed the original
guard return false, the separately pinned candidate return true, an observed
`Hash.update` wrapper return false, and restoration return true. Every runtime
function's complete text had one exact occurrence in the complete official
source. This finite result establishes neither performance nor new executable
application functions. Full receiving checks, actual whole-output comparisons,
original deadlines, generation freshness, strict parity and the complete gate
remain separately required.

The complete new profile, original whole-owner derive and original resolver
files pass all 17 Node cases with the original deadlines and the independent
deadline audit. The observed Node 20.20.2 run took 134.161 seconds and sampled
2797965312 bytes of total container memory with a 768 MiB JavaScript heap.
The earlier 512 MiB attempt exhausted its heap in the original receiving
files; it is retained as a failed attempt.

Both complete Bun attempts, including its documented low-memory mode, were
stopped by the existing container memory guard before all cases finished.
Their sampled peaks were 2873638912 and 2876977152 bytes, respectively; all
owned descendants were reaped. Those attempts do not qualify Bun receiving
behavior. No original case, assertion, test deadline or memory guard was
removed or increased to obtain the passing Node result. Fresh compiler
registration, canonical generation, strict parity and the full gate remain
unfinished.
