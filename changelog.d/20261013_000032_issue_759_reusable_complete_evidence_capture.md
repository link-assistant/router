### Added

- Add a reusable complete evidence packet CLI using Python's standard XZ/TAR support. It verifies complete pinned originals before/during/after capture, reopens every decoded member, preserves duplicate bytes with backward hardlinks, refuses changed/linked/escaping inputs and preserves existing outputs. Source commits, input bounds, explicit deadlines and every original hash remain in the receipt; storage grants no semantic or gate authority.
- Node and Bun behavioral tests independently reopen actual archives and verify source/output preservation and refusal boundaries. The development workflow links the reusable tool so other repositories can retain full translation-cycle evidence without copying task-specific archive builders. No Rust or network execution is required.
