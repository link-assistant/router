//! Independent scalar domain edge oracles. Source drafted; CI execution only.

#[test]
fn fixed_width_bitwise_boundaries() {
    macro_rules! unsigned {
        ($($ty:ty),+ $(,)?) => {$(
            assert_eq!(!0 as $ty, <$ty>::MAX);
            assert_eq!(<$ty>::MAX & 0, 0);
            assert_eq!(<$ty>::MAX ^ <$ty>::MAX, 0);
            assert_eq!(<$ty>::MAX | 0, <$ty>::MAX);
        )+};
    }
    macro_rules! signed {
        ($($ty:ty),+ $(,)?) => {$(
            assert_eq!(!<$ty>::MIN, <$ty>::MAX);
            assert_eq!(<$ty>::MIN ^ <$ty>::MAX, -1);
            assert_eq!(<$ty>::MIN & <$ty>::MAX, 0);
            assert_eq!(<$ty>::MIN | <$ty>::MAX, -1);
        )+};
    }
    unsigned!(u8, u16, u32, u64, u128);
    signed!(i8, i16, i32, i64, i128);
}

#[test]
fn truncation_and_sign_extension_are_distinct() {
    assert_eq!((-1_i128) as u128, u128::MAX);
    assert_eq!((u128::MAX) as i8, -1);
    assert_eq!((i8::MIN) as u128, u128::MAX - 127);
    assert_eq!((u128::MAX - 255) as u8, 0);
    assert_eq!((u8::MAX) as i16, 255);
    assert_eq!((i8::MIN) as i128, -128);
}

#[test]
fn boolean_bitwise_evaluates_both_operands_in_order() {
    let mut visits = Vec::new();
    let value = { visits.push(1); false } & { visits.push(2); true };
    assert!(!value);
    assert_eq!(visits, vec![1, 2]);
    visits.clear();
    let value = { visits.push(1); false } && { visits.push(2); true };
    assert!(!value);
    assert_eq!(visits, vec![1]);
}

#[test]
fn total_integer_methods_preserve_boundaries() {
    macro_rules! unsigned {
        ($($ty:ty),+ $(,)?) => {$(
            assert_eq!(<$ty>::MAX.saturating_add(1), <$ty>::MAX);
            assert_eq!((0 as $ty).saturating_sub(1), 0);
            assert_eq!(<$ty>::MAX.saturating_mul(2), <$ty>::MAX);
            assert_eq!(<$ty>::MAX.wrapping_add(1), 0);
            assert_eq!((0 as $ty).wrapping_sub(1), <$ty>::MAX);
            assert_eq!(<$ty>::MAX.min(0), 0);
            assert_eq!(<$ty>::MAX.max(0), <$ty>::MAX);
        )+};
    }
    macro_rules! signed {
        ($($ty:ty),+ $(,)?) => {$(
            assert_eq!(<$ty>::MAX.saturating_add(1), <$ty>::MAX);
            assert_eq!(<$ty>::MIN.saturating_sub(1), <$ty>::MIN);
            assert_eq!(<$ty>::MIN.saturating_mul(-1), <$ty>::MAX);
            assert_eq!(<$ty>::MAX.wrapping_add(1), <$ty>::MIN);
            assert_eq!(<$ty>::MIN.wrapping_sub(1), <$ty>::MAX);
            assert_eq!(<$ty>::MIN.min(<$ty>::MAX), <$ty>::MIN);
            assert_eq!(<$ty>::MIN.max(<$ty>::MAX), <$ty>::MAX);
        )+};
    }
    unsigned!(u8, u16, u32, u64, u128);
    signed!(i8, i16, i32, i64, i128);
}

#[test]
fn checked_constant_arithmetic_has_no_runtime_wrapping_fallback() {
    const CAPACITY: u128 = 64_u128 * 1024_u128;
    const SIGNED_REMAINDER: i128 = -7_i128 % 3_i128;
    assert_eq!(CAPACITY, 65536);
    assert_eq!(SIGNED_REMAINDER, -1);
    macro_rules! checked_signed {
        ($($ty:ty),+ $(,)?) => {$(
            assert_eq!(<$ty>::MIN.checked_div(-1), None);
            assert_eq!(<$ty>::MIN.checked_rem(-1), None);
            assert_eq!(<$ty>::MIN.checked_neg(), None);
            assert_eq!(<$ty>::MAX.checked_add(1), None);
            assert_eq!((1 as $ty).checked_div(0), None);
        )+};
    }
    checked_signed!(i8, i16, i32, i64, i128);
}
