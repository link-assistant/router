# Bounded native source operation sharing draft

SOURCE ONLY. All implementation, source equations, counter/isolation cases and
receiving checks are UNRUN. No timing or memory result is claimed. CI feedback
is uninspected. Full drafting, actual coverage, parity and qualification are OPEN.

The bulk paths repeatedly reconstruct the same original Rust project while they
independently check paired modules and reparsed meta. This source draft introduces
one bounded synchronous operation around those paths and the explicit candidate
API. A source reader may retain one original native project for exact current
tracked Rust/Cargo bytes, compilation profile and freshly issued dependency-source
proof digests. Changing that bundle evicts the one retained project. Unexpected
untracked native input reads refuse. Other receiving source does not issue native
type evidence.

Reader identity is private to its issuing consumer. The actual candidate support
module owns an unexported reader; a public or foreign reader with equal source
bytes cannot expose, mutate or inject that consumer's retained project. The
operation handle, counters, source rows and digests remain inert DATA. Every
receiving namespace, ownership check, source function and serialized/reparsed
meta boundary is independently reconstructed as before. Proposed native forward
verification still calls the fresh project checker directly.

Source host and actual dependency packages rejoin at reads and operation close.
Success, primary errors, rejected asynchronous results and closing-fence failures
clear the operation-owned state. Failed reads invalidate the retained entry.
Nested synchronous operations share the current scope within a fixed depth bound;
there is no retained native project or source/verdict cache between operations.
Diagnostic counters describe only the current operation and grant no permission.

Ten complete source equations retain copied originals and exactly language then
repository phases. Independent drafts cover reuse, changed native bytes, reader
isolation, a real candidate traversal after a public read, standalone freshness,
primary thrown values, nested bounds, proxies/accessors/then getters and complete
operation cleanup. All are unrun. The draft still needs measured receiving
throughput and memory qualification; it does not waive deadlines, worker heap or
disk bounds. Wider translation families and all remaining full-source/namespace/
ownership/platform/CI obligations remain OPEN. Eight same-SHA JavaScript gates
still precede fatal CI-only Rust. No local test, parser, translator or compilation
ran.
