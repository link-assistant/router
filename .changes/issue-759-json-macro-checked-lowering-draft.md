Add an unverified checked frontend draft for the actual locked serde_json::json!
owner, using original per-module bytes, separate namespace bindings, literal
object keys and existing immutable JSON Value/Number/Map layouts. Parser/checker
hooks retain original invocation spans and interpolation expressions; emitted
constructors evaluate them once in original order and reuse checked nonlocal
Option/Result propagation. Unknown/custom owners, effects, floats, duplicate or
dynamic keys, const expressions and the unclosed alloc::vec! array-macro branch
remain carried. No original Rust body is rewritten.

Feature evidence retains 13 original incoming manifest nodes plus the pinned
serde_core serializer-owner manifest and their licenses. jsonschema enables float_roundtrip;
this construction profile grants no numeric-deserializer authority and still
requires preserve_order/arbitrary_precision absent. Actual Rust 1.89 sources pin
the literal-key Into/From/String conversion and implicit prelude ownership.
The private invocation context does not accept caller-provided closure flags.

Seven new authored cases supplement the 12 previous source/runtime draft cases.
The positive production proof is prepared from the entire unchanged
bridge_request_tools.rs child, SHA256
5ba0389968e32e9c99eebd7a38d32c80c8278e86278ace56290025c71a636941,
with an explicitly authored closed root carrier and 12 independent tool-choice
expectations. It is not a full Router crate proof. All 19 cases and generated
JS/strict-TS execution remain UNRUN while the publisher owns the compiler window.
No emitted-function gain, global namespace authority, generated trait behavior
or runtime parity is claimed. The next focused window must collect all initial
failures before a coherent repair and both-runner validation.
