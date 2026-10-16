---
kind: fixed
---

Serialize caller-supplied item carriers with the original `JSON.stringify(module[name])` expression before comparing against the separately cached authentic immutable carrier. This preserves native callee and receiver lookup before an item getter can replace JSON operations, and freshly serializes the caller on every check. Source hashes, private owner joins and all other checks remain unchanged.

Update two historical helper export assertions to retain their exact two-export originals and explicitly recognize the added storage-only composer factory. Both still check full original source imports, native bytes, logical budgets, callback tapes and deadlines. The complete existing item-getter observer remains unchanged. Runtime tests are UNRUN in this source-only repair.
