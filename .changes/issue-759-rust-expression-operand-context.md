Preserve the Rust condition's exclusion of unparenthesized record expressions
through boolean, comparison, arithmetic and unary operands. The pinned frontend
had dropped this context on right operands, so the complete original
canonical_openai_model body mistook UpstreamProvider::OpenAICompatible followed
by its if-block for a record literal. Exact, validated adapter anchors retain
only the record-context flag; statement flags stay local. Original vendor bytes
remain unchanged, and parentheses/call arguments still permit record values.

Four new cases check JavaScript/strict TypeScript behavior, explicit nested
record contexts, enum syntax with unproved equality still refused, and invalid
unparenthesized records. The original OpenAI function's full body, source hash
and span assertions remain. Three existing fixture errors are corrected by
reading the checked meta envelope through its canonical reader and retaining
real named-lifetime escape/coercion negatives. The paired retry is pending;
initial Node/Bun both passed 150/154 with the same four failures preserved.

The first expanded retry passed 157/158 in both engines. Its one new regression
identified the tuple frontend forwarding the outer condition context inside
explicit parentheses. Group and tuple elements now use the same ordinary
expression context as the original vendor parenthesis parser. The assertion
remains unchanged; final paired verification is pending.

The language rule is documented in the Rust Reference:
https://doc.rust-lang.org/reference/expressions/if-expr.html#syntax
