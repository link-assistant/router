---
bump: patch
---

### Fixed
- `router with claude` no longer refuses to launch with "router catalog contains no models authorized for this client token" on a z.ai-only catalog. Router v1.14.2 served z.ai rows as `selector_kind: provider_advertised_exact_id`, a spelling the wrapper could not parse, and the wrapper dropped every such row without a word. `selector_kind` now has one shared, forward-compatible wire contract: the server emits `concrete`, every known spelling parses (an unknown one reads as `unknown` instead of discarding the model), and a catalog row that still cannot be parsed fails loudly by index and ID, asking you to align the Router versions (#620).
- Claude Code's `/model` picker under `router with claude` now lists every exact model the client's authorized catalog serves, Anthropic's own IDs included, rather than only rows that carry Router-verified capability metadata. A row without that evidence is listed as `{label, model}` and no identity is invented for it. Before, one z.ai model without a verified profile was enough to refuse the whole launch (#621).
