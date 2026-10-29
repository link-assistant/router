//! Independent native helper boundary oracle sources. Source only; CI unrun.
//! Rust executes only after all eight same-SHA JavaScript stages pass.
fn identity(value: bool) -> bool { value }
fn invert(value: bool) -> bool { !identity(value) }
fn caller(flag: bool, value: bool) -> bool { identity(flag) && invert(value) }

#[test]
fn boolean_helper_closure_is_exhaustive() {
    for flag in [false, true] {
        for value in [false, true] {
            assert_eq!(caller(flag, value), flag && !value);
            assert_eq!(invert(value), !value);
        }
    }
}

macro_rules! identity_domain {
    ($test:ident, $kind:ty) => {
        #[test]
        fn $test() {
            fn leaf(value: $kind) -> $kind { value }
            fn use_leaf(flag: bool, value: $kind) -> $kind {
                if flag { leaf(value) } else { leaf(value) }
            }
            for value in [<$kind>::MIN, 0, <$kind>::MAX] {
                for flag in [false, true] {
                    assert_eq!(use_leaf(flag, value), value);
                }
            }
        }
    };
}
identity_domain!(u8_helper_boundaries, u8);
identity_domain!(u16_helper_boundaries, u16);
identity_domain!(u32_helper_boundaries, u32);
identity_domain!(u64_helper_boundaries, u64);
identity_domain!(u128_helper_boundaries, u128);
identity_domain!(i8_helper_boundaries, i8);
identity_domain!(i16_helper_boundaries, i16);
identity_domain!(i32_helper_boundaries, i32);
identity_domain!(i64_helper_boundaries, i64);
identity_domain!(i128_helper_boundaries, i128);

#[test]
fn qualified_total_complement_helper_boundaries() {
    fn leaf(value: u8) -> u8 { !value }
    fn call_leaf(value: u8) -> u8 { leaf(value) }
    for value in [0_u8, 1, 127, 255] {
        assert_eq!(call_leaf(value), u8::MAX - value);
    }
}
