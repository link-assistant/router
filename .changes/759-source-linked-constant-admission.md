Require original parser source links and bounded checked evaluation before
admitting a Rust constant. Keep original declaration/initializer UTF-16 spans,
full-file hashes, resolved signatures, layouts, scope and target profile proof
separate from checked parser spans. Reject overflow, division by zero, missing
links and unsupported evaluation; evaluate only selected const branches while
retaining const eligibility checks for every branch. Const function runtime
eligibility does not establish compile-time behavior for every input.

Normalize external metadata through descriptors and native Map intrinsics;
keep immutable constant evaluation evidence outside target renaming and
executable dependency discovery. Full runtime parity remains unestablished.
