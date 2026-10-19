### Changed

- Report bounded per-module progress for source-generated Default and Clone translation. Long generator work now identifies its current original module independently of written-method parsing.

### Validation

- All five complete progress fixtures pass under Node and Bun. Exact meta, JavaScript and TypeScript output stays identical with tracing enabled, and callback failures propagate without granting admission or writing partial artifacts.
