### Fixed

- Restore the complete intrinsic owner after native stack-capture guard probes.
  Bun also adds `originalLine` and `originalColumn`; restoring only `stack`
  left those fields on `Map.prototype` and caused later parser checks to refuse.
  Reuse the existing full-owner snapshot, restoration and descriptor checks,
  keeping every hostile probe, callback observation and original deadline.
  Production guards and registered parser profiles remain unchanged.
