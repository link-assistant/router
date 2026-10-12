Draft actual named lifetime parameters for free functions through the reusable
Rust → checked meta-language → JavaScript/TypeScript path. Original tokens and
bodies are retained; lifetime-only binders are not rewritten into static borrows.
Shared references and nested Option/product leaves keep declared identities;
calls conservatively retain constraints from every contributing input. Named
local annotations and returns enforce their source borrow origins. Type/const
generics, outlives bounds, mutable references and undeclared lifetime names
remain refused. Named str borrow syntax independently resolves the actual type
namespace before using primitive string semantics; source types, imports and
unknown glob scopes cannot gain those operations from spelling alone.

This is a source-only future draft: all ten authored cases are UNRUN, no parser
probe, target compilation, producer, complete gate or Rust build has executed.
The original OpenAI model function is an exact-source syntax fixture, with no
whole-corpus gain, trait dispatch, native equivalence or complete parity claim.
See the Rust Reference's function lifetime rules:
https://doc.rust-lang.org/reference/lifetime-elision.html
