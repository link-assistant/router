# Exact scalar text equality and read-only text captures

Actual `===`/`!==` values now accept closed scalar text domains as well as the
existing integer/Boolean domains. Original `String` variables are read without
moving them; the native operator receives explicit shared `str` views. Temporary
String-producing operations still consume their original owning arguments, and
conditional owning values retain both arms' actual move joins. Text ordering
stays refused because UTF-16 and Unicode scalar ordering are different contracts.

Immediate source-qualified synchronous callbacks may read an owned text capture
through a shared view or a nonconsuming equality. A captured String still cannot
move into a local or an owning operation, mutate, or lend an escaping result.
The full actual callback, captured owner, operation source, borrow roots and
complete enclosing function remain independently checked. Callback/meta rows
cannot issue a permit by changing a public capture type.

The existing native reader transports explicit shared views and the projection
proposes complete JS source. The consumer still reparses semantic meta and
requires exact fresh native syntax reproduction. Full original sources, ordered
language/repository substitutions and lossless CST/source inverses are retained.

Independent JS, strict TS, native inverse, Unicode, ownership, capture mutation,
forged-meta and refusal sources are drafted and unrun. An independent Rust
oracle is registered for the existing fatal gate after all eight JavaScript
stages. No compiler diagnostics, tests, experiments, translation, preparers,
regeneration, local Rust tools or CI were executed during this draft. Wider
capture/structural domains, namespace/bootstrap, production parity and every
unfinished bulk requirement remain open.
