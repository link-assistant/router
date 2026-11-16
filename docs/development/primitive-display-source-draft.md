# Primitive Display source substitution draft

Implementation and all independent case/oracle SOURCE remain UNRUN. No tests,
compilation, translator/preparer/compiler execution or CI feedback review occurred.
Full translation, reverse/sync coverage and verification remain unfinished.

The shared integer source engine proposes primitive to_string() through the
existing exact core format!("{}", receiver) abstraction. It covers bool and all
ten fixed integer widths, original immutable aliases, explicitly suffixed integer
literals and terminal integer method chains. Receivers remain evaluated once;
all preceding arguments keep their order. No new runtime/native ABI is introduced.
Literal-only functions no longer require an unrelated typed parameter; unsuffixed
numeric defaults, floats, usize/isize and nominal ToString remain unsupported here.
The complete64-link chain bound includes a terminal display operation and refuses
the whole function at overflow instead of returning earlier partial edits.

The text source engine separately recognizes bounded canonical formatting macro
receivers, allowing later text methods to use existing checked core operations.
Existing callback-body composition reuses the same integer/display/text stages;
it retains full original child/parent source equations and all existing limits.
Every one of the twelve source adopter namespace scopes now explicitly protects
bool and every fixed primitive spelling from same-name declarations/imports.
Original namespace, trait, format-owner, argument, primitive identity, borrow,
effect and whole-function checks remain mandatory; source roles prove none.

Seventeen compiler equations retain immutable originals, native-selected owners,
language followed by repository substitutions, complete serialized/reparsed CST
and exact inverses. Independent unrun source covers widths/min/max/bool/literals/
aliases/chain order/caps, namespace refusals, six source APIs, nineteen actual
callers with JS/strict TS and native Rust edge/order oracle source. Wider reverse
formatting and receiving qualification remain open; existing reverse obligations
are not waived. Global namespace/production/native parity/reverse/sync/freshness/
delivery requirements all remain OPEN, with no measured coverage or speed claim.
