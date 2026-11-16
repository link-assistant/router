# Current standard Copy source draft

The active primitive and shared-reference Copy consumers now select a separate
complete copy of the original source rules. The original public APIs and their
historical metadata remain available unchanged. This is an unverified source
draft, not evidence of new executable application coverage.

`withFreshStandardCopyInputs` reads both complete pinned Rust marker and Option
archives, the Option manifest and all four license files on each operation.
Every input has a literal export-visible URL and exact size/hash pin. Bounded
descriptor reads compare file identity and timestamps around the read; decoded
sources pass complete Rust CST serialization and reparsing. Public records are
DATA only and explicitly deny source, namespace and runtime authority. The
fixture-directory option is confined to this DATA reader; private consumers
always select their own fixed installed inputs.

`withCurrentStandardCopySourceOperation` shares the freshly read inputs and
primitive macro extraction only within one synchronous operation. Nested calls
share that scope under a depth-64 bound. Independent operations issue distinct
records and re-read all inputs. Completion, exceptions and invalid results
clear the private map and active frame. Closing fences attempt every input and
the host guard, preserving an original thrown value even when that value is
null or undefined. Async/proxy callbacks, Promise/proxy results and any then
field are refused without reading its getter. No new source, hash, verdict,
owner or result cache survives across operations.

Eighteen actual consumer imports select the copied APIs without changing their
local names or semantic predicates. Both project translation pipelines, the
native receiving operation, standalone checking, collected-project checking and
JavaScript emission wrap their complete original bodies in the shared scope.
The original private type, ownership, namespace and caller checks still decide
admission. A matching Copy macro candidate cannot grant a trait implementation
to an arbitrary caller or prove the wider native owner closure.

Twenty-four complete source equations retain frozen originals, full inverse
substitutions and exactly the language then repository sequences. Independent
case sources cover all ten fixed-width primitives, bool/f64, old API equality,
per-operation identities, nested scopes, all seven input fences, between-call
changes, invalid results, callback errors and recovery. Isolated module copies
exercise the private consumer closing fence without changing checked-in files
used by concurrent cases. No preparer, parser, compiler or case was executed.

Import-cycle qualification, full exported receiving qualification, performance,
platform profiles, canonical/reverse freshness and full parity remain OPEN.
Repeated complete source reads may affect throughput; operation-local sharing
is drafted to contain that cost, but it has not been measured. This prerequisite
does not close the native producer/attribute/macro namespace proof or the full
translation requirement set. CI remains uninspected during source drafting.
