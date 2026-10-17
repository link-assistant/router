Extend the existing owned literal-text corpus producer with bounded source
candidates for shared `str` parameters, immutable lexical aliases, literal-text
matches with a borrowed fallback, and `Option<&str>` conversion function items.
Repository substitutions use the existing qualified owned `format!` interface;
they do not establish arbitrary `ToString`, `ToOwned` or `Display` dispatch.

The original literal-only API, source/corpus bounds, serialized/reparsed CST,
two phases, complete source maps and inverse remain. Actual dependency sources
may discharge derive effects through the existing private producer context,
which is reconstructed and rechecked for each operation. Unknown method-return
roles, producer effects, macros, callbacks and competing names remain refused.
No source candidate grants type, borrow or executable authority; the ordinary
independent checker, lifetime pass and existing formatting runtime still decide.

The new whole eight-case file retains complete current application parents and
the entire original `canonical_provider` body, distinguishing adopted carriers
from unresolved full-parent scopes. It checks Unicode, Option, lexical scopes,
source changes, counterfeits and refusals through JavaScript and strict
TypeScript with 60-second cases and 20-second child limits. Independent native
Rust oracle source is CI-only. All new receiving checks are UNRUN at this source
checkpoint; no current whole-crate coverage or performance gain is claimed.
