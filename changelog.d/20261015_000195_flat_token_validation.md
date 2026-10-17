### Changed

- Draft a native-qualified successful flat-token validation path before the
  existing original-parser token copy. Every mutable token descriptor and
  scalar is freshly checked with the original cell/UTF-8 budgets and exact
  adjacent `&&` split rule; every difference or unsupported form falls back
  to the complete unchanged copier and comparator. No caller evidence is
  cached and no source, checker or runtime authority is added.
- Retain complete original source-link and intrinsic-issuer fixtures plus
  eight whole-file equivalence, mutation, budget, inherited-hook, callback
  and cold-leaf controls. Node's JavaScript `Buffer.byteLength` deliberately
  keeps the original path. All new tests are unrun; no speed, allocation,
  sixty-second full-project success or runtime-parity result is claimed.
