//! `link-assistant-router`: the original command name, kept beside the
//! canonical `router` so existing scripts, deployment units and documented
//! commands keep working (issue #222).
//!
//! It compiles exactly the `router` entry point. A separate file rather than a
//! second `[[bin]]` naming `src/main.rs`, because Cargo warns on every build
//! when two targets share one source file (issue #648). `include!` keeps the
//! out-of-line `mod` items in `src/main.rs` resolving next to that file.
//!
//! The path is absolute on purpose. A relative `"../main.rs"` makes rustc
//! record that module tree as `src/bin/../*.rs`, which llvm-cov reports as 26
//! extra files and so lowers line coverage; see
//! `experiments/include-coverage-paths`.

include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/main.rs"));
