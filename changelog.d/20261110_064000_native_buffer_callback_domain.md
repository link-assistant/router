### Fixed

- Preserve native Buffer JSON bytes without observing conversion getters, even
  above the byte index threshold or with changed storage properties. Refuse own
  iterator overrides before observing them in either runtime. All 18 codec and
  source-contract cases pass in Node and Bun; the separate Core Node deadline
  audit and the complete JavaScript gate remain unfinished (#784).
