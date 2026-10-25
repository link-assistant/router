# Complete terminal scalar switch source draft

Actual terminal switches now use original native case nodes, a stable scalar
selector and bounded literal labels. Empty stacked labels share their actual
complete body. One final default is required, and every selected body must
return from the actual function on every path. Full ownership, resource cleanup,
error-family, returned-root and native-domain checks run separately for each arm.
A census retains the case block's shared lexical binding rules; explicit nested
blocks may introduce their separate checked scopes.

Every label is checked, including labels sharing the default body. Calls and
other side effects cannot disappear behind a shared default. The selector must
be a genuine scalar binding or original scalar literal, so case lowering never
repeats a source effect. Each bounded stacked-label group becomes a balanced
strict equality tree with the original left-to-right order. Text labels use the
nonconsuming exact equality rule; numeric labels retain their actual native range.

The emitter creates a real lexical scope containing complete nested conditional
return blocks. Existing canonical block/conditional inverses propose full JS
source, and the consumer must freshly reproduce every original Rust token.
Switch breaks, continuing switches, nonempty fallthrough, dynamic labels and
non-final defaults remain explicit separate obligations. No loop exit can be
misread as a switch exit or bypass a required continuation.

Complete prior sources, both ordered rule sequences and lossless CST/source
inverses are retained. Independent JS, strict TS, native inverse, Unicode,
stacked/default/nested cases, shared-scope TDZ, side-effect refusal, forged-meta
and Rust oracle sources are drafted and unrun. No compiler diagnostics, tests,
experiments, preparers, translator, regeneration, local Rust tools or CI ran.
Broader switches/matches, namespace/bootstrap, production parity and every
unfinished bulk requirement remain open.
