---
bump: patch
---

### Changed
- The token store's data structure is called a **links network** throughout, never a graph. Links whose sources and targets are themselves links are not vertices joined by edges: every link is addressable and can be the source or target of another, and a point is simply a link whose source and target are itself. Calling it a graph invites reasoning that does not hold here — that edges are anonymous, that they cannot be referenced, that vertices are a separate population. "Network" is accepted as a shorthand where the context is clear.
- `scripts/check-terminology.rs` enforces this in CI, over identifiers as well as prose and in every human language. Other people's names for their own things stay allowed — GraphQL, Git's object graph, a build system's dependency graph — and a single line can opt out with a `terminology-check: allow` marker where the rule itself has to be quoted. `CONTRIBUTING.md` documents the rule and the reason behind it.
