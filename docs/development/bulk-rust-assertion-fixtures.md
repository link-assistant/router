# Reuse original Rust assertions for fast target checks

Run the complete `tools/translation/test/generated-rust-scalar-oracles.test.mjs`
file in Node and Bun. It discovers literal scalar equality assertions in original
Rust test functions for already admitted production functions. The same cases
execute against actual generated JavaScript and independently strict-compiled
TypeScript. All selected target files compile together in one TypeScript process;
the original single-module test helper remains unchanged.

Discovery retains original assertion spans, test names and exclusions. It checks
the complete original Rust hash and source reconstruction against the current
inventory before reading generated targets. Supported literals include strings,
booleans, bounded integer syntax and finite f64 values; explicit `to_bits`
observations preserve negative zero. Computed inputs, shadowed callers, unknown
child imports and unsupported types or literals remain outside this runner.

The initial current census selects 47 assertions over 18 functions in three
modules, executes each target separately, and reports 256 excluded candidates.
This is a fixture census for the examined modules, not Rust execution evidence,
a full unit-test census or an increase in executable translation coverage.

The four complete control/production cases pass in both Node and Bun under their
original 60-second deadlines. No Rust tool runs locally. Existing native suites,
strict parity, deterministic forward/reverse checks, all platform profiles and
the same-SHA JavaScript gate remain mandatory before fatal Rust CI checks.
