//! Independent ordinary builtin attribute source oracle. Gated CI only.
trait Marker { fn value(&self) -> u8; }
struct Value;
#[automatically_derived]
impl Marker for Value { fn value(&self) -> u8 { 7 } }

#[test]
fn automatically_derived_keeps_the_original_impl_and_module_bindings() {
    assert_eq!(Value.value(), 7);
}
