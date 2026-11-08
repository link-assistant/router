### Fixed

- Add an explicit Text return adoption for complete core-Str Unicode whitespace
  filters while preserving the original literal-only migration and refusing
  shadowed or unsupported contexts. This source adoption does not establish
  executable parity; complete application receiving remains required.
