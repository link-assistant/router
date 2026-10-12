Compose the default
nongeneric named-field Serialize route using the actual pinned
`serialize_struct`, `serialize_struct_as_struct`, `serialize_struct_visitor`,
`get_member`, `StructTrait::SerializeStruct` and field-length-fold templates.
Original field identities/type spans, source ordering, empty sequences and
nonremote/nonpacked member access are retained. Typed interpolation composes
the original quoted syntax; no Router function or generated Serialize body is
hand-written as an executable replacement.

Only default or rename-only helpers are selected. Flatten, skip predicates,
custom serializer functions, tags, remote/packed layouts, tuple payloads and
generic headers remain refused. Original field types may still lack runtime
layouts: this bang-only abstraction does not admit serialization behavior,
effects, destructors, field moves or any type/value namespace. Deserialize and
Schemars remain residual owners. No binder hook or bang-scope flag is changed.

The final 103-case source-output and related scope passed in Node and Bun at clean `e1f10dd8d`, with all initial and retry failures retained in `dev/log/issues/759/translator-derive-bang-verification`. No automatic bulk/project activation, generated trait execution, complete runtime parity or Rust execution is claimed.
