Replaced a stale formatting-refusal expectation with checks for the currently
admitted original ProviderKeyMode.parse method and its source proof. The whole
Clap documentation source tests now expose the actual checked method by its
emitted name and test all three variants, exact untrimmed case-sensitive error
strings, Unicode and NUL inputs, and invalid host arguments in JavaScript and
strict TypeScript. Existing source, namespace, constants and as_str checks
remain intact. These added assertions are unrun; this test-only update does
not attribute a new library gain or establish full-project parity.
