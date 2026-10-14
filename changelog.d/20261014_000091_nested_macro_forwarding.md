---
bump: patch
---

### Fixed

- Discover complete nested macro invocations inside privately checked expanded expressions and forward their own token-tree inputs with exact parent lineage. Preserve opaque expression boundaries and original transparent `ident`, `lifetime` and `tt` forwarding rules, including complete member and call expressions.

### Validation

- All 75 cases across ten complete related files pass in Node and Bun at unchanged deadlines. Six complete original serde_json definition, input and expansion vectors are byte-identical across engines. Copied, changed, foreign, getter and proxy records refuse; unknown payload and allocation macros retain their independent obligations. Source expansion does not confer namespace or runtime authority.
