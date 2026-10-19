### Fixed
- Preserve the genuine module context when checking source-producer uncertainty in a module with no derive invocations. Physical child functions with valid ancestor-restricted visibility are no longer mistaken for crate-root declarations; original module-view, attribute and producer checks remain required.
