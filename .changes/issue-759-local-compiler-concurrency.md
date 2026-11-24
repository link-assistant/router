Bound the complete local translation and acceptance test stages to two Node
test-file workers, limiting concurrent TypeScript compiler children on machines
with many cores. Every fixture and strict parity check still runs. A behavioral
test verifies all four independent fixtures execute within the concurrency cap.
