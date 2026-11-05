// Independent primitive expression alias oracle SOURCE. Gated CI only, UNRUN.
use link_assistant_router::translation_integer_core as core;
#[test]
fn original_expression_bytes_keep_integer_order_precedence_and_saturation() {
    for value in [0_u64, 1, u64::MAX - 1] {
        let next = value + 1;
        assert_eq!(core::u64_saturating_mul(next, 2), next.saturating_mul(2));
    }
    for value in [0_u64, 1, 100] {
        let left = 1 + value * 2;
        let next = left / 2;
        assert_eq!(core::u64_wrapping_add(next, 1), next.wrapping_add(1));
        assert_eq!(core::u64_wrapping_add(next, 1), value + 1);
    }
    for value in [-2_i64, -1, 0, 1] {
        let magnitude = -(value + 1);
        assert_eq!(core::i64_saturating_abs(magnitude), magnitude.saturating_abs());
    }
    let initial: u64 = 1 + 2 * 3;
    assert_eq!(core::u64_saturating_mul(initial, 2), 14);
}
