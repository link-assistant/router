### Changed
- Draft actual same-module primitive Vec helper graphs across both translation
  directions, strict paired source, interpreter and native discovery.
- Preserve linear result moves, guarded/unused call failures, complete callee
  checks and the unchanged scalar-only public API. All new checks are unrun.
