# Shared primitive vector input source draft

Status: SOURCE DRAFT ONLY. All receiving, JS/strict TS, interpreter, CST/meta,
native inverse/oracles, freshness and performance verification remains UNRUN.
No CI feedback was inspected. Full synchronization is OPEN.

A shared primitive Vec input requires a leading immutable local result of the
actual paired len(input). This existing operation validates its complete
primitive domain and 4,096-value bound. Mixed owned/shared prefixes retain the
owned truncate(input, u64::MAX) guard. Old owned-only observer APIs keep their
original behavior; additive mixed-prefix APIs join actual source bindings and
complete native ABI. The paired core and native history remain unchanged.

JS/TS uses the exact Parameters<typeof paired_len>[0] witness, actual parameter
symbol and live input root. Shared inputs and aliases are copied references,
not owned moves. Shared reads accept only that root or an actual owned local
borrow. Rust emission passes existing references directly, and takes one shared
borrow only for owned operands. No owned operation accepts a shared role. Shared Vec parameters also participate
in the emitter's borrowed-input census, retaining an explicit lifetime when a
separate borrowed string result would otherwise have ambiguous elision.

Native checking joins an actual written single shared reference, original
standard Copy source identity and its actual owned standard Vec pointee with
resolved fixed primitive elements. The complete private caller/type/module
checks remain mandatory; a returned type record grants no namespace/owner
permission. The parser's original source ownership metadata is retained rather
than rewritten. Lexical flow tracks live shared input roots, copied aliases,
helper inputs and copied outputs. Escaping shared-vector results remain an
explicit separate refusal, as do mutable/nested references and owned coercions.

Same-module shared helpers retain actual leading len guards, complete original
body/dependency rechecks and loan-free primitive or copied Option outputs.
Independent eleven-domain cases cover repeated reads, aliases, helpers, mixed
prefixes, max/oversized inputs, ownership/refusal boundaries, emitted JS/strict
TS, both interpreters, CST/meta and native inverse. Native receiving and Rust
oracle sources are CI obligations after all eight same-SHA JavaScript gates.
Seventeen complete source equations preserve frozen originals and exact
inverses through the required language and repository phases. Broader source
adoption, literal bridging, escaping returns and full coverage remain OPEN.
