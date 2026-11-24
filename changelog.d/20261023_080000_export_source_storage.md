### Fixed

- Extend the strict source-fixture producer's repository substitution sequence
  to use level-nine gzip for its complete output archive, preserving every
  decoded byte while fitting the existing four-MiB compiler export file budget.
- Refresh the complete isolated compiler registry and portable Git fixtures from
  the actual current committed compiler and TypeScript sources.
