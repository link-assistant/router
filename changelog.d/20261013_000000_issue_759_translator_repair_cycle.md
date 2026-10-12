---
bump: patch
---

### Fixed

- Correct source-selected JSON features, original primitive conversion macros and trait prelude resolution, let-chain control literals and relocated source spans, parser identity checks, declaration-boundary refusal attribution, and module-qualified shared enum patterns in the reusable Rust translator.

### Added

- Translate checked primitive integer shifts, narrowing casts, and monomorphic source type aliases through common meta to JavaScript and TypeScript. Primitive casts and shifts also have bounded constant evaluation. Original formatter namespace, unsafe and floating-point obligations remain explicit; full runtime parity is unfinished.
