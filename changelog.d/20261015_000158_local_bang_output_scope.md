Added a source-only, unverified private observer for complete selected macro
outputs with block-local use/static declarations, full initializer/type/cast
syntax and exact nested output lineage. Genuine supported opaque expression and
pattern AST captures require their original private parser context. Existing
142/155 APIs remain strict; attributes, unproved AST/type forms and actual
tracing/builtin output closure still refuse. This adds no Host admission,
namespace, macro ownership, runtime or original Router body authority.
