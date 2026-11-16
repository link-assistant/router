# Native bridge trust and upgraded transport source draft

SOURCE ONLY. No implementation, translator, preparer, parser, fixture, Rust tool,
JavaScript test, compiler or experiment executed. CI feedback remains uninspected.

The native bridge now accepts the selected inference CA on actual temporary,
persistent configure and managed-client paths. Public callers without a CA retain
existing wrappers. Persisted configuration supplies trust only for its exact
normalized inference origin. Daemon startup validates trust before listener/state
publication, adds only the selected CA path to its existing minimal environment,
and includes that path in nonce/PID/state reuse checks. Old state without that
optional field remains readable. Different paths require owned restart.

A small native helper reads bounded regular non-symlink CA files afresh for each
new HTTP request or WebSocket upgrade. It augments normal roots, preserves chain,
validity and hostname verification, and refuses redirects. Default-root requests
retain the existing pooled client. Selected trust does not create a receipt cache.
Filesystem replacement races and platform pressure remain receiving obligations.

The upgraded transport reuses existing reqwest stream support and validates
status, Upgrade/Connection, challenge accept, offered subprotocol and absence of
unsolicited extensions before constructing a raw client WebSocket. It rejects
ambiguous handshake fields. No Cargo dependency or lockfile change was needed.
The APIs are documented by [reqwest Response::upgrade](https://docs.rs/reqwest/latest/reqwest/struct.Response.html#method.upgrade),
[Upgraded](https://docs.rs/reqwest/latest/reqwest/struct.Upgraded.html), and
[tungstenite derive_accept_key](https://docs.rs/tungstenite/latest/tungstenite/handshake/fn.derive_accept_key.html).
These source references do not constitute compilation or behavior evidence.

Normalized upstream URLs must retain the configured origin and backend namespace,
including any existing base path, so dot-segment traversal cannot escape it.
Existing request/response projection, body/message caps and connect deadline stay
in the application path. Platform shutdown/PID reuse qualification remains OPEN.

Two compiler equations and six complete native source substitutions preserve
old native pins through seventeen history steps across fifteen paths. The new
helper is a complete pinned native input. Every step retains language then
repository rules, serialized/reparsed CST and exact complete inverse DATA. No
history or source receipt grants semantic, namespace or execution authority.

Independent unrun native source covers fresh CA corruption/restoration, bounds,
HTTPS-only selection, file/ancestor symlinks, successful HTTP upgrade, challenge
mismatch, protocol mismatch, duplicate response fields, extensions and redirects.
Source cases cover helper reconstruction and all known one/two-step joins without
weakening unchanged native inputs. Existing selected-CA JS/TS TLS fixtures and
native HTTP relay cases remain unrun. Actual native positive TLS/WSS, complete
persistent lifecycle, platform matrix, full forward/reverse synchronization,
receiving qualification and delivery all remain OPEN. No completion or executable
coverage percentage is established. Rust remains CI-only after eight same-SHA
JavaScript gates, after source drafting is complete.
