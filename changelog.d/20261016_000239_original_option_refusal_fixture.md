### Fixed

- Inspect the actual standalone translation IR in the eager `Option::ok_or`
  refusal fixture. The standalone API returns `ir`, `javascript` and
  `typescript`; the fixture previously read nonexistent `meta.functions`.
  All fourteen original rejected inputs and complete source-preservation
  assertions remain intact. The complete eight-case file still requires
  receiving qualification; its earlier full-project timeout is retained.
