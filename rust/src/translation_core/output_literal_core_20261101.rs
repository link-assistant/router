//! Qualified static output bridge. Formatting/output internals stay native.
//! No builtin format_args or std::fmt::Arguments ABI qualification is implied.
use super::LiteralArguments;

pub fn output_literal_write(stderr: bool, value: LiteralArguments) {
    crate::operation_output::write(stderr, ::std::format_args!("{value}"));
}
pub fn output_literal_result(stderr: bool, value: LiteralArguments) {
    crate::operation_output::write_result(stderr, ::std::format_args!("{value}"));
}
pub fn output_literal_passthrough(stderr: bool, value: LiteralArguments) {
    crate::operation_output::write_passthrough(stderr, ::std::format_args!("{value}"));
}
