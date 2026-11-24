# Borrowed JSON views in resource callers: source draft

This unrun family adds the actual existing `json_index_str` facade and native
reference semantics. Shared public JSON aliases preserve their original roots;
indexing borrows only the JSON owner and never the key. Missing keys retain
the existing JSON Null behavior. A lossless source or returned operation row
still supplies no type, ownership or namespace authority.

Every public immutable JSON input starts with its actual input root. Checked
local projections, local helpers and conditional helper results preserve all
possible roots. A borrowed JSON or text result may depend on a local owned JSON
value for local use, but cannot escape that owner. Copies return fresh owned
storage. Moves and replacement of any possible backing owner remain refused
while an original view is live. Finishing a lexical scope removes its private
views before the following outer source is checked. Borrowing an owner produced
as a temporary still requires a separate lifetime rule and remains refused.

A separate structural shared-reference query now selects native lifetimes for
JSON as well as text returns. The original text-only query keeps its original
API. The actual checked return-root set determines which public parameters
share the emitted lifetime. The native inverse still requires full source
reproduction and cannot invent or shorten an original lifetime.

Full original contract, flow and caller-emission snapshots retain ordered
language then repository substitutions, serialized/reparsed CST and complete
inverses. Independent unrun JS/strict TS source covers returned identity,
local owned copies, shared aliases, multiple possible helper roots, scope-end
replacement, local borrowed HTTP text and invalid escapes/moves. Separate Rust
oracle source provides identity and value behavior. General temporary loans,
borrowed collection iteration, outcome-sensitive state, namespace/bootstrap,
production parity and every unfinished requirement remain open.
