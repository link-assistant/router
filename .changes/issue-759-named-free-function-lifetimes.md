Draft actual named lifetime parameters for free functions through the reusable
Rust → checked meta-language → JavaScript/TypeScript path. Original tokens and
bodies are retained; lifetime-only binders are not rewritten into static borrows.
Shared references and nested Option/product leaves keep declared identities;
calls conservatively retain constraints from every contributing input. Named
local annotations and returns enforce their source borrow origins. Type/const
generics, outlives bounds, mutable references and undeclared lifetime names
remain refused. Named str borrow syntax independently resolves the actual type
namespace before using primitive string semantics; source types, imports and
unknown glob scopes cannot gain those operations from spelling alone. Captured
function signatures seal binder names, spans and tokens before source linking
and after semantic checking; changing that metadata invalidates source evidence.

The first paired 23-file batch passed 150/154 cases in both Node and Bun.
It retained four failures: one original condition-parsing bug and three stale
test assumptions. Those corrections and four condition-context regressions are
authored; their complete paired verification is pending. No producer, complete
gate or Rust build has executed for this draft.
The original OpenAI model function is an exact-source syntax fixture, with no
whole-corpus gain, trait dispatch, native equivalence or complete parity claim.
See the Rust Reference's function lifetime rules:
https://doc.rust-lang.org/reference/lifetime-elision.html

Source-only lexical review additionally reuses the existing pinned Rust 1.89
strict/reserved identifier selection, checks contiguous quote/name coordinates,
and preserves weak contextual names. Static references receive the same token
adjacency check; whitespace before the apostrophe remains valid. The lexical
rules are documented at https://doc.rust-lang.org/reference/tokens.html#lifetimes-and-loop-labels.
