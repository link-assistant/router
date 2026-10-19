Document the borrowed-text Rust oracle's intentional exact owned `format!`
expressions with two narrowly scoped file allowances: `uninlined_format_args`
and `useless_format`. Every original expression, assertion and eight-case body
remains byte-identical. No translator, application or generated source changes.

This is source-predicted lint intent, not an observed Clippy failure. The
exported macro wrapper may already suppress some external-macro diagnostics.
Clippy and Rust remain UNRUN locally; same-SHA JavaScript gating still applies.
