# Source-qualified binary64 body synchronization source draft

`proposeForwardFloatingBodySynchronization` extends the whole-body rules to
actual source-qualified by-value `f64`, alongside the existing scalar domains.
The project manifest selects `"inverse": "floating-bodies"`; the complete
original range/control/imperative APIs remain unchanged in the copied module.
All code, tests, source preparers and native oracles are unrun.

The original compiler exposes one explicit additional observation format:
`targetBinding('floating-scalars')`. It reads its actual checked signature and
adds only source-qualified nonreference primitive `f64` to the bounded scalar
candidates. Default and `true` calls retain their exact earlier format and
floating refusal. These observations and public shape classifiers grant no
type, source or executable authority. The inverse still requires each actual
compiler-issued checked source association and fresh whole native compilation.

Decimal candidates reuse the complete existing bounded exact-rational binary64
decoder. Written decimals round once to nearest with ties to even; source bytes,
exponent limits, overflowing-literal refusals and unsupported f32 remain intact.
Native literal proposals carry explicit `f64` suffixes. Runtime decimal syntax
comparison uses that exact value; complete native TypeScript type syntax stays
exact. Signed zero retains its unary sign, and existing source-qualified native
NaN constants use the original owner-checked constant path. NaN sign/payload
observability, arbitrary Infinity constants and new floating CTFE are excluded.

IEEE arithmetic, division/remainder, actual scalar function calls, branch/loop
control and mutable source-f64 locals reuse the original native checker and
emitter. Actual native integer locals keep their separate widths. Unchecked
Number arithmetic cannot silently replace native checked integer operations,
because every complete guard/operator/error and target body must reproduce.
The runtime domain is ordinary Number values for f64 inputs, including NaN,
infinities, subnormals and signed zeros; this format introduces no coercion of
caller objects or strings.

The project runtime provider now has an additive complete registered host/core
source path. It copies the original private validator, changes only its root
selection and retains every original import/closure check, native epoch and
128-source bound. Older fixed-root APIs remain intact. This includes previously
omitted standard float/time/type-layout sources and their actual generated
declarations. Per-language materialization still selects only the used closure,
retains licenses/notices, rejects modified runtime files and rechecks current
source bytes. No new source, owner or verdict cache crosses source proposals.

Complete native/paired CST histories and source inverses, unchanged original
body/header/guard checks, full executable/refusal census and fresh guarded
project installation remain required. Existing file/node/depth/memory limits
and every same-SHA JavaScript-first CI stage stay unchanged.

Independent authored source covers JS/strict TS IEEE classes, signed zeros,
finite overflow, subnormals, exact decimal bit patterns, mixed floating/integer
loop state, old/new observation formats, integer/annotation/source refusals,
complete registered runtime closure, physical project modes and native Rust
oracles. All are unrun. General owned/slice/generic/recursive/async bodies,
additional standard operations, namespace bootstrap, production adoption/parity
and every other incomplete requirement remain open.

Native-source checking in this draft means the original Rust frontend implemented
in JavaScript and its checked semantic meta pipeline. The proposal still reports
`nativeRustGrammarChecked: false`. Rust compiler, grammar and behavior evidence
remain CI-only after the complete same-SHA JavaScript gate; no Rust tool is
invoked by these APIs.
