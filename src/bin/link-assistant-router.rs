//! `link-assistant-router`: the original command name, kept beside the
//! canonical `router` so existing scripts, deployment units and documented
//! commands keep working (issue #222).
//!
//! It compiles exactly the `router` entry point. A separate file rather than a
//! second `[[bin]]` naming `src/main.rs`, because Cargo warns on every build
//! when two targets share one source file (issue #648). `include!` keeps the
//! out-of-line `mod` items in `src/main.rs` resolving next to that file.

include!("../main.rs");
