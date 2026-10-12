Source-only, unverified followup to the quote/meta draft: author the default
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

Two additional authored cases cover named fields and the original empty-field
sequence/length branch, bringing this separate draft to 12 cases. All remain
UNRUN while the publisher owns the compiler window. The previous 37-case
CSV/Result/Deref/reverse queue is unchanged and unverified.
