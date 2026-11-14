### Fixed

- Run all reverse compiler test files in exhaustive independent Node and Bun
  CI bins, with unchanged original cases, deadlines and per-job limits. Keep
  all original regeneration checks mandatory in an independent job, preserve
  every raw receipt and require every bin before Rust verification.
