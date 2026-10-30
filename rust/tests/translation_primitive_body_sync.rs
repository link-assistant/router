// Native oracle SOURCE only. CI runs after every required JavaScript gate.
#[test]
fn primitive_body_sync_cast_shift_and_eager_boolean_edges() {
    assert_eq!((-1_i128) as u8, 255);
    assert_eq!(255_u128 as i8, -1);
    assert_eq!(i128::MIN as u128, 1_u128 << 127);
    assert_eq!(85_u8 & 51_u8, 17);
    assert_eq!(85_u128 | 51_u128, 119);
    assert_eq!(85_i128 ^ 51_i128, 102);
    assert_eq!(85_u128 >> 1_i8, 42);
    assert_eq!(1_i128 << 127_u8, i128::MIN);
    for (left, right, and, or, xor) in [
        (false, false, false, false, false),
        (false, true, false, true, true),
        (true, false, false, true, true),
        (true, true, true, true, false),
    ] {
        assert_eq!(left & right, and);
        assert_eq!(left | right, or);
        assert_eq!(left ^ right, xor);
    }
}
