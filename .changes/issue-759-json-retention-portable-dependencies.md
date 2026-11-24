SOURCE-ONLY / UNRUN: package the complete source-derived retention helper
dependency closure in emitted runtime assets, preserving original JavaScript
bodies and pinned full Rust input data. Relocate only import specifiers and
include the pinned Formal AI lexer license. The existing sixth retention case
now verifies real relocated JavaScript and strict TypeScript readers instead of
importing the worktree runtime by an absolute path. No new capability/trait,
allocator/native/whole-source authority or CURRENT feature-guard change.
