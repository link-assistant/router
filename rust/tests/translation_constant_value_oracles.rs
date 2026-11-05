//! Primitive constant value oracles. SOURCE ONLY; CI execution only.

#[test]
fn primitive_constant_selection_and_total_operations() {
    macro_rules! check {
        ($($ty:ty),+ $(,)?) => {$(
            {
                const EQUAL: bool = (3 as $ty) + (4 as $ty) == (7 as $ty);
                const SELECT: $ty = if EQUAL { (5 as $ty) * (2 as $ty) } else { 0 };
                const LOCAL: $ty = { let count = (3 as $ty) + (4 as $ty); count * 2 };
                const MASK: $ty = ((3 as $ty) + (4 as $ty)) & 3;
                const SATURATED: $ty = <$ty>::MAX.saturating_add(1);
                const WRAPPED: $ty = <$ty>::MAX.wrapping_add(1);
                assert!(EQUAL);
                assert_eq!(SELECT, 10);
                assert_eq!(LOCAL, 14);
                assert_eq!(MASK, 3);
                assert_eq!(SATURATED, <$ty>::MAX);
                assert_eq!(WRAPPED, <$ty>::MIN);
            }
        )+};
    }
    check!(u8, i8, u16, i16, u32, i32, u64, i64, u128, i128);
}

#[test]
fn boolean_constant_equality_and_cast_boundaries() {
    const CHOICE: bool = !(false || true) && true;
    const BITS: bool = (true ^ false) & true;
    const NARROW: i8 = 255_u8 as i8;
    const WIDEN: i128 = 255_u8 as i128;
    assert!(!CHOICE);
    assert!(BITS);
    assert_eq!(NARROW, -1);
    assert_eq!(WIDEN, 255);
}
