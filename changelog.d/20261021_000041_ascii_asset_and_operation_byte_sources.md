### Changed
- Materialize the explicit ASCII-only asset reader and the separate synchronous operation-local proof byte composer from their complete native/CST source equations, retaining full inverses and fresh output checks.
- The ASCII reader validates its declared selected sources and intentionally has a distinct read schedule; it does not claim callback equivalence with the unrelated full asset builder. The byte composer remains an opt-in API, with no production issuer wiring or measured performance gain yet.
