Prepare a source-only JSON macro candidate using original checksum-pinned
serde_json 1.0.151 and serde_core 1.0.229 archives (219,656 compressed bytes).
Reuse the existing immutable Value/Number/Map layouts, original token trees,
Rust string decoder, and bounded declarative-definition parser. Retain original
literal-key invocation syntax, interpolation order, and explicit nonlocal `?`
obligations. Add descriptor-guarded scalar/canonical-Value adapter candidates.

This isolated draft has 12 authored cases in two files; none has run. One case
prepares independent JS and strict-compiled TS adapter execution, not a Router
body translation. The unchanged whole bridge_request_tools source and exact
translate_tool_choice span/hash are pinned with independent expected cases.
Zero original bodies have been admitted or executed by this capability.

No Host/checker/bulk integration is included. Macro binding/aliases, generated
mixed-site key `.into()` owner lookup, unified Cargo features, checked effects
and nonlocal flow, and canonical Value Serialize closure remain prerequisites.
All namespace, expansion, generated-trait and runtime-parity authority is false.
Custom serialization, scalar floats, duplicate/dynamic keys, unknown owners and
unproved expressions remain outside the candidate. The runtime's existing
canonical finite Value Number copy is distinct from scalar float conversion.
