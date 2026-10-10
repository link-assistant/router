//! Compile the actual parser separately to check upstream signed-zero grammar.
pub use link_assistant_router::thinking::{ThinkingConfig, ThinkingLevel, ThinkingMode};
#[path = "../../src/thinking/parser.rs"]
mod parser;

fn main() {
    for raw in ["-0", "-000"] {
        assert_eq!(parser::parse_numeric_suffix(raw), Some(0));
        assert_eq!(
            parser::parse_suffix(&format!("exact({raw})"))
                .config()
                .unwrap()
                .mode,
            ThinkingMode::Off
        );
    }
}
