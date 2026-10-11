The draft Rust translator checks primitive integer literal ranges in source
patterns and proves match coverage with bounded interval unions. Inclusive and
exclusive endpoints retain their actual Rust signedness, suffix, domain and
source spans. Guards never provide coverage, and overlapping arms retain source
order with one evaluation of the subject. Unguarded exhaustive integer matches
lower to ordinary checked let/if/binary IR, preserving existing const admission
and concrete selected-path evaluation rules.

The authored tests pin the unchanged logging::http_failure declaration and the
ThinkingLevel::from_budget method with its complete original enum attributes.
The Thinking test selects declarations mechanically and uses the existing sealed
derive dependency profile; it does not certify the macro-blocked whole file.
Additional tests exercise signed minima, u128 interval coverage without value
enumeration, gaps, guarded overlaps, effect order, suffix identity, strict TS,
and explicit refusals. Nonliteral/open endpoints, custom/ref/float/char domains,
nested aggregate range matches and guarded const matches remain unsupported.

Source-only draft based on integrated 7e25187c90f5201fc529c528ab98037d4a184d7c.
git diff --check passes. Compiler, runtime and strict TypeScript tests have not
run: the publisher holds the current compiler window. No generated artifacts,
original Rust bodies, dependencies or runtime parity claims are changed.
