Add a source-only draft for observing complete privately expanded expression
output, including exact nested expansion lineage, mixed source origins and a
small generic boolean lowering lane. The new parser entry consumes the entire
expansion, so selecting a convenient nested body cannot omit surrounding items.

UNVERIFIED: no Node, Bun or TypeScript checks have run for this draft. New tests
cover authored nested macro source through checked meta and both targets, but
their results are pending the coordinator's engine window. Existing parser APIs
and whole tests are unchanged. No caller macro ownership, global namespace,
runtime, I/O or Router body coverage is granted. Actual matches/assert_eq,
format_args, tracing and conditional Unix obligations remain explicit.
