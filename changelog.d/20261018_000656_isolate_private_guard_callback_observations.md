### Fixed

- Restore deliberate native getter substitutions after the private API call and before awaiting its rejection, so Node async-hook bookkeeping cannot contaminate the guard callback observations. Preserve all eight cases, original deadlines, exact refusal messages and zero callback assertions.
