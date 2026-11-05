// Independent Rust oracle source. Execute only in CI after every JS stage passes.
macro_rules! make {
    ($name:ident, $ty:ty, $value:literal) => { fn $name() -> $ty { $value } };
}
macro_rules! outer {
    ($name:ident, $value:literal) => { make!($name, u8, $value); };
}
macro_rules! ignore {
    ($input:tt) => {};
}
make!(seven, u8, 7);
make!(enabled, bool, true);
outer!(nine, 9);
ignore!((unresolved!(never_run)));

#[test]
fn original_literal_type_and_recursive_macro_behavior() {
    assert_eq!(seven(), 7);
    assert!(enabled());
    assert_eq!(nine(), 9);
}

#[test]
fn macro_local_identifier_hygiene_is_observable() {
    macro_rules! hygienic {
        ($value:expr) => {{ let x = 1_u8; $value + x }};
    }
    let x = 40_u8;
    assert_eq!(hygienic!(x), 41);
    // The source renderer must retain this invocation until it has a hygiene
    // rule; directly rendering tokens would incorrectly bind both x uses.
}
