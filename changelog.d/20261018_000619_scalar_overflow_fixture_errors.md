Correct the two new hygiene/EOF target fixtures to expect the existing
`RangeError` for an out-of-range `u8` BigInt. Preserve their separate
`TypeError` checks for JavaScript numbers, complete workloads and deadlines.
Production translation and the existing macro test files are unchanged.
Whole-file Node/Bun verification remains required.
