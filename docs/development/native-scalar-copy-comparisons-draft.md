# Native scalar copy and comparison source draft

The seven reverse private checkers now draft standalone native fixed integer
copies, conditional copies and exact comparisons without requiring an unrelated
helper call. Actual native operands still require the genuine explicit primitive
ABI context, fresh declaration symbols and the full existing source/type/loan
checks. Inputs retain the native ABI's advertised Rust range precondition.
Raw bigint-shaped types, bool/number/JSON copies, pointer-sized and unresolved
foreign domains cannot select this lane.

Comparisons retain their actual native AST span, checked operand domain and
operator after all existing comparison checks succeed. Direct primitive variable
returns retain bounded pending Copy observations; these are adopted only when
the complete function has no imported/local call or other admitted native source
operation. Whole function termination, every return contract, lexical binding,
move/loan and fresh source checks remain mandatory. Existing call-based copy
functions preserve their original result shape. No host-call binding is forged.

The shared recorder keeps all selected and pending source under the existing
4096-record/two-million-code-unit bounds. Its DATA cannot replace the private
whole-source reissue and equality check. Runtime preparation selects the primitive
module for actual bitwise use or a genuine helper call; comparison/copy records
alone do not require that module to execute. All original qualified runtime and
input source checks remain, with no cross-operation cache.

The actual forward primitive emitter is copied into a shared presentation module
through complete source equations, keeping the active Host implementation below
1000 lines and retaining all existing checked operation guards.

Eighteen full compiler equations and unrun ten-width/seven-profile copies,
comparison truth/ordering boundaries, conditional returns, metadata tampering,
canonical Rust inverses and refusal cases are drafted. The existing CI-only
native scalar-flow oracle remains unrun. Source/CST/meta transport, all remaining
native owner/global closure, production, receiving, freshness, full parity and
synchronization requirements remain open; no measured coverage or completion
claim is made.
