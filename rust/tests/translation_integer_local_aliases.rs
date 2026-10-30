// Independent boundary oracle SOURCE. Execute only in gated Rust CI.
use link_assistant_router::translation_integer_core as core;
#[test]
fn immutable_alias_and_selected_result_chains_preserve_boundaries() {
    for (value, wanted) in [(0_u64, 2_u64), (1, 4), (9_223_372_036_854_775_807, u64::MAX), (u64::MAX, u64::MAX)] {
        let alias = value;
        let first = alias.saturating_add(1);
        let original = first.saturating_mul(2);
        let copied = value;
        let adopted_first = core::u64_saturating_add(copied, 1);
        let adopted = core::u64_saturating_mul(adopted_first, 2);
        assert_eq!(original, wanted);
        assert_eq!(adopted, wanted);
    }
}
#[test]
fn native_literal_and_checked_result_domains_stay_distinct() {
    let minimum = -9_223_372_036_854_775_808_i64;
    assert_eq!(minimum.saturating_abs(), i64::MAX);
    assert_eq!(core::i64_saturating_abs(minimum), i64::MAX);
    let maximum = u64::MAX;
    assert_eq!(maximum.wrapping_add(1), 0);
    assert_eq!(core::u64_wrapping_add(maximum, 1), 0);
    assert_eq!(maximum.checked_add(1), None);
    assert_eq!(core::u64_checked_add(maximum, 1), None);
    let amount = 1_u64;
    assert_eq!(core::u64_saturating_add(0, amount), 1);
}
