### Fixed

- Resolve overlapping retained-output references through private scalar cells,
  preserving the original UTF16 wire bytes and refusal boundaries while avoiding
  repeated slices of accumulated output.
