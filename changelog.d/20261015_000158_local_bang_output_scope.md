Added a private observer for complete selected macro
outputs with block-local use/static declarations, full initializer/type/cast
syntax and exact nested output lineage. Genuine supported opaque expression and
pattern AST captures require their original private parser context. Existing
142/155 APIs remain strict; attributes, unproved AST/type forms and actual
tracing/builtin output closure still refuse. This adds no Host admission,
namespace, macro ownership, runtime or original Router body authority.

The focused whole ten-case file passed in Node and Bun at source commit
`6bb72e24d543355de5fa0e6cf2540dff749e2213`, with unchanged case limits and
TypeScript 5.9.3 inputs. All twelve full vectors (1,886,843 bytes per engine)
matched byte for byte. The prior eight-of-ten failures remain retained.
This verifies the selected output observer and its refusal controls; it does
not establish a full gate, current generated artifacts or runtime parity.
