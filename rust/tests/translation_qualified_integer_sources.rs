// Independent qualified native integer oracle SOURCE; gated CI only, UNRUN.
use link_assistant_router::translation_integer_core as core;
#[test]
fn qualified_domains_and_bounds_keep_real_primitive_behavior() {
    for value in [0_u64, 1, ::core::primitive::u64::MAX] {
        let amount: ::core::primitive::u64 = value;
        assert_eq!(core::u64_saturating_add(amount, ::core::primitive::u64::MAX), amount.saturating_add(::core::primitive::u64::MAX));
        assert_eq!(core::u64_saturating_mul(amount, ::std::primitive::u64::MAX), amount.saturating_mul(::std::primitive::u64::MAX));
    }
    for value in [::std::primitive::i64::MIN, -1, 0, ::std::primitive::i64::MAX] {
        let amount: ::core::primitive::i64 = value;
        assert_eq!(core::i64_saturating_abs(amount), amount.saturating_abs());
    }
    let highest = ::core::primitive::u64::MAX;
    assert_eq!(core::u64_wrapping_add(highest, 1), 0);
}
