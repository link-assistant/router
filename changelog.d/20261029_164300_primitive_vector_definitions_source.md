### Changed
- Draft separate JS/TS-first primitive vector definition insertion with precise
  source-derived result domains, complete helper graphs and native ABI checks.
- Preserve the original scalar API and all move/source fences; export the new
  reusable API. All new paired/native and CI-only Rust case sources are unrun.
