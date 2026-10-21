// Rust oracle source only. Execute in gated CI; no local Rust invocation.
include!("parent.rs");

#[test]
fn included_function_preserves_all_u8_values() {
    for value in 0..=u8::MAX {
        assert_eq!(included(value), value);
    }
}
