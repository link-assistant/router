//! Explicit eager owned-text output. This is a source-adoption contract, not
//! std::fmt::Arguments or unqualified println equivalence. Text is the actual
//! standard String alias: by-value transfer and its real field destructor stay
//! native library internals; no Copy/no-Drop or literal-carrier proof is reused.
use super::Text;

fn bounded(value: &Text) {
    assert!(value.len() <= 2097152, "owned dynamic output UTF8 byte domain");
}

pub fn output_text_write(stderr: bool, value: Text) {
    bounded(&value);
    crate::operation_output::write(stderr, ::std::format_args!("{value}"));
}
pub fn output_text_result(stderr: bool, value: Text) {
    bounded(&value);
    crate::operation_output::write_result(stderr, ::std::format_args!("{value}"));
}
pub fn output_text_passthrough(stderr: bool, value: Text) {
    bounded(&value);
    crate::operation_output::write_passthrough(stderr, ::std::format_args!("{value}"));
}
