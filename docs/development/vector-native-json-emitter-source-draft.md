# Native bounded JSON vector emitter source draft

SOURCE ONLY; all implementation, cases and full source equations remain UNRUN.
CI feedback is uninspected. Complete drafting and delivery remain OPEN.

An explicit Rust-only emission mode reuses the existing privately rechecked
complete JSON-vector program. It maps copy, field update and domain validation
to the bounded native JSON library. The legacy default Rust support prelude and
TypeScript APIs retain their existing emission. The new mode emits tail values
inside complete branches, preserves immutable local evaluation order and once-
only constructor child bindings, and validates every owned/shared JSON input
before any branch, including empty results. Shared inputs receive one borrow;
owned inputs are explicitly borrowed. Constructor result checks remain inside
the original expression block after construction and before its return.

The mode is DATA emission, not an installation or semantic permit. It rejects
non-JSON programs, mixed/forged contexts, unknown mode values and non-Rust targets.
The receiving source program is checked afresh by the existing private issuer;
there is no saved verdict. Three full source equations retain complete originals,
CST inverses, and language then repository substitutions.

Independent unrun cases cover both input ownership modes, empty branches,
immutable aliases, constructor evaluation, compatibility of default emission,
forged source/meta refusals and complete source equations. Actual fresh native
JSON tail acceptance, whole-body reproduction, original-header joining and
source-unit synchronization remain OPEN. No runtime parity or native coverage
is claimed. CI-only Rust execution still requires eight same-SHA JavaScript gates.
