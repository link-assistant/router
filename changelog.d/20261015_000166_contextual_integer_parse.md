Added a source-only, unverified language type-constraint draft for an original
`str.parse().ok()` call with an actual expected fixed-integer `Option` payload.
It rejoins the privately captured caller syntax, normal receiver and inherent
method selection, registered integer parser, Result layout and ParseIntError;
the existing parsing and emission implementations remain in use. It adds no
float parsing, generic guess, iterator-position rule or namespace authority.

The new complete JS/strict TypeScript test file includes the unchanged original
thinking parser in its complete original thinking-module context, integer and
Unicode boundaries, custom methods, shadowed owners and private-source negatives.
These tests have not run. Full-library admission and generated-output gains are
unmeasured; the separate original Iterator::position closure remains refused.
