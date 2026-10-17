Preserve the original checked public reexport route when constructing generated
Option, Result, tuple, array and shared-reference type metadata. Previously the
normalizer treated an already resolved canonical owner as another written path,
masking its private implementation module. Evidence is private to the parser and
the exact original type span, consuming scope and resolved target; another
written private path still undergoes visibility checks. No signature supplies a
callable body. Six new cases cover generated JavaScript, strict TypeScript,
complete out-of-line inputs and source-scope/occurrence refusals. Full original
corpus regeneration and parity remain separate obligations.
