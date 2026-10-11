Avoid scanning complete original Rust source for unused lexical macro evidence
when Copy certification already has complete resolved attribute bindings. The
fallback retains original shadow and unknown-import refusals and consumes each
of its lexical results once. No semantic context or proof is shared between
compilation profiles. The focused verification and performance measurement for
this draft are pending; it does not establish full translation or native parity.
