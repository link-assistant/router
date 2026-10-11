Reject the inherited `&str` parser shortcut when the original source type
namespace shadows `str` or remains unresolved. This source-only draft prevents
a same-spelled source type from acquiring standard string and whitespace
contracts. Five negative source cases and a value-namespace positive control
are authored and UNRUN. No canonical
regeneration, full gate, Rust build or production gain is claimed.
