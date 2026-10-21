The Schemars with-output receiving fixture now constructs actual repository
items from the complete captured original library graph, with its original
Cargo inputs and production profile. Previously `clients.rs` was supplied as
an isolated crate root despite declaring external child modules; the private
nested-helper proof correctly refused that incomplete source universe.

The original eight test bodies and 60-second deadlines are unchanged. The
helper proof, registration joins and default APIs are unchanged. Root's prior
receiving run passed 92 of 93 assertions and failed the actual ClientKind case
at the genuine nested-helper check. This source-only fixture repair has not
been executed; the complete graph may expose additional ownership refusals or
exceed the unchanged receiving deadline. The actual graph fixture also uses the
existing project's source-backed standard/matches/TOML external namespace
construction, so the imported TOML `value` function keeps its genuine value
identity rather than an unresolved possible macro slot. No coverage gain is
established.
