### Fixed

- Refuse changed native parser operations before module discovery can serialize
  source data, preserving physical reader errors and complete source histories.
  The new Node/Bun regression cases pass; complete Core receiving, translation
  parity and the JavaScript gate remain unfinished (#784).
