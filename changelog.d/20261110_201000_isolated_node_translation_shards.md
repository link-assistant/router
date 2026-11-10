### Changed

- Run complete Node translation files in sixteen exhaustive CI shards with one
  worker per runner, preserving every original case and job deadline, independent
  freshness checks and fatal deadline audits. Bun keeps its eight complete-file
  shards. Strict parity and the complete JavaScript gate remain required.
