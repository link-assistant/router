### Fixed

- Retain explicit single-bound `dyn Trait` syntax in original derive fragments and close the matching original Default visitor path. This restores source namespace closure around opaque trait-object fields without executing their Debug, Default or trait methods. Unsupported bounds, binders, modifiers, macros and generated runtime behavior remain refused.
- Add complete original Router declaration/module evidence, serialization-layout regressions, source/refusal controls and independent JavaScript/strict TypeScript behavior checks. Source draft only: the new whole eight-case file and existing files are unrun locally; no Rust tools were run.
