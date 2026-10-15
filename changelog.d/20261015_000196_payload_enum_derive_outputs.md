### Changed

- Draft complete original-source Clone and PartialEq output grammars for tuple/named payload enums, sharing the genuine compiler pattern/parser recipe closure with Debug. Retain every original variant, typed field, Clone resolver branch, PartialEq discriminant/fieldless branch and compiler-generated unreachable block; this proves syntax confinement only, not generated trait execution, Copy/no-Drop, type availability or global namespace completeness.
- Add explicit payload input opt-in for independently closed Clone/PartialEq/Eq consumers (Eq output closure is the separate 000197 batch). Leave unsupported derives and the legacy unit-only candidate API unchanged.
- Project structural `>>>` tokens into their three exact original Rust `>` positions, reusing the existing `>>` rule. Keep compound assignments, strict type parsing, source budgets, private caller joins and unrelated macro/attribute obligations unchanged. Retain complete original OAuthProvider/ProviderStore and payload-owner inputs and positive/negative tests.
- Source-only candidate: all new and affected tests are UNRUN. No schema restoration, execution gain or performance qualification is claimed.

- Receiving follow-up (test-only, UNRUN): retain the failed first pair and compose the complete captured original crate graph with the genuine JSON table registered before derive issuance for original-parent cases. Reuse one private context per test process; retain full inputs/graph/diagnostics and preserve all original cases, assertions, source files and caps.
