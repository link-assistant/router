//! Independent original passive macro/attribute source. Gated CI only.
#[allow(unused_macros)]
macro_rules! make {
    ($name:ident, $value:literal) => {
        #[allow(dead_code)]
        pub fn $name() -> u8 { $value }
    };
}
mod child {
    make!(seven, 7);
    pub mod nested { make!(nine, 9); }
}
make!(three, 3);

#[test]
fn passive_attributes_keep_macro_scope_and_generated_values() {
    assert_eq!(child::seven(), 7);
    assert_eq!(child::nested::nine(), 9);
    assert_eq!(three(), 3);
}
