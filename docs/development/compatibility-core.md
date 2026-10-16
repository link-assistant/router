# Translate application code through a compatibility core

Prioritize rules that remove common blockers in actual Router functions. Rank
the generated project diagnostics before selecting a batch, then measure newly
executable application functions after regeneration. A function's first refusal
identifies an opportunity; removing it can expose further missing behavior.

The compatibility core provides matching Rust and JavaScript abstractions for
selected library operations. Its Rust implementation may delegate to the standard
library or an existing dependency. Its JavaScript implementation may use a native
implementation or an already checked runtime helper. These library internals can
remain untranslated. Their implementation status and behavioral obligations stay
explicit; an API declaration or stub does not establish equivalence.

## Contracts and translation rules

Give each operation a stable identity, concrete parameter and result types,
evaluation order, ownership requirements, observable effects and error behavior.
Declare the supported domain and retain refusals outside it. Reuse existing
checked formatting, numeric, tagged-value and collection helpers where suitable.
JavaScript coercion, floating-point formatting, integer overflow and collection
iteration order must not silently replace Rust behavior.

Bind a contract to the actual owned Rust facade and its qualified source symbol.
Retain the facade source and matching JavaScript implementation. A caller-supplied
flag, an unqualified spelling or copied metadata cannot establish that binding.
New contracts do not require translating every internal standard-library body;
they require an explicit implementation boundary and independent behavioral
evidence for the operation being used.

Use the lossless CST extension in the actual source path, including serialization
and reparsing. Reusable language rules check operands and lower the operation to
checked semantic meta. Repository rules bind Router's facade paths, imports and
output conventions. Preserve the separate serialized, reparsed semantic check
before emission. Both rule sequences remain explicit and extensible.

Automate application migrations with CST substitutions and retained before/after
source. Resolve the selected binding before rewriting a library call; skip and
report ambiguous imports or shadowing. Keep migration tooling reusable. Generated
targets come from the translator, rather than manual patches.

## Verify and measure the batch

Use shared, independently authored cases for both implementations, including edge
cases, evaluation order, errors and effects. Execute JavaScript and strict
TypeScript locally in complete focused files. Add matching Rust oracle source,
but run no Rust locally during issue #759. Rust executes in CI only after every
required JavaScript stage passes for that same commit.

Test the new rules on actual Router function bodies and preserve their full CST,
checked meta and target artifacts. Report application translation coverage,
runtime feature parity and intentionally untranslated library implementations
separately. A successful primitive fixture does not establish that every caller
is translated. Regenerate the full corpus, inspect remaining refusals and run the
complete JavaScript gate before claiming full coverage or synchronization.
