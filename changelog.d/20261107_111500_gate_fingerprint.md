### Fixed

- Stream local JavaScript gate fingerprints in 64 KiB chunks while preserving
  the complete source, mode, symlink and deletion hash framing, reducing temporary
  file-content allocation for large checked-in evidence.
