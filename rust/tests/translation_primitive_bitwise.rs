// Independent native oracle SOURCE. CI only after all same-SHA JavaScript gates.
#[test]
fn boolean_bitwise_and_compound_operations_are_eager() {
    use std::cell::RefCell;
    for (left, right, and, or, xor) in [(false, false, false, false, false), (false, true, false, true, true), (true, false, false, true, true), (true, true, true, true, false)] {
        assert_eq!(left & right, and);
        assert_eq!(left | right, or);
        assert_eq!(left ^ right, xor);
        let mut value = left;
        value |= right;
        assert_eq!(value, or);
    }
    let trace = RefCell::new(Vec::new());
    let probe = |name, value| { trace.borrow_mut().push(name); value };
    assert!(!(probe("left", false) & probe("right", true)));
    assert_eq!(*trace.borrow(), ["left", "right"]);
    trace.borrow_mut().clear();
    assert!(probe("left", true) | probe("right", false));
    assert_eq!(*trace.borrow(), ["left", "right"]);
}

#[test]
fn fixed_bitwise_operations_keep_width_sign_precedence_and_compound_values() {
    macro_rules! domain {
        ($ty:ty) => {{
            let left: $ty = 85;
            let right: $ty = 51;
            assert_eq!(left & right, 17);
            assert_eq!(left | right, 119);
            assert_eq!(left ^ right, 102);
        }};
    }
    domain!(u8); domain!(i8); domain!(u16); domain!(i16); domain!(u32);
    domain!(i32); domain!(u64); domain!(i64); domain!(u128); domain!(i128);
    assert_eq!(-1_i128 ^ i128::MIN, i128::MAX);
    assert_eq!(u128::MAX ^ 1, u128::MAX - 1);
    let mut result = 5_u8;
    result <<= 1;
    result >>= 1;
    result ^= 3;
    result &= 15;
    result |= 16;
    assert_eq!(result, 22);
    let (a, b, c, d) = (1_u8, 6_u8, 3_u8, 2_u8);
    assert_eq!(a | b ^ c & d, 5);
}
