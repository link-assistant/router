### Added

- Draft complete current native textual/module macro lookup premises, including
  actual parent-module disambiguation and its full callback dependencies. Reuse
  the existing function inventory as source DATA, preserve original CSTs and
  both substitution sequences, and add independent unrun source/native scope
  cases. Caller owner/export closure, full translation and every verification
  gate remain unfinished; no tests, translator, local Rust or CI ran.
