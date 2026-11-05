// Independent signed numeric oracle SOURCE. Gated CI only; never run locally.
#[test]
fn signed_boundaries_checked_division_callbacks_and_recursion_are_explicit() {
    assert_eq!(i64::MIN.saturating_add(1), i64::MIN + 1);
    assert_eq!(i64::MAX.saturating_add(1), i64::MAX);
    assert_eq!(i64::MAX.wrapping_add(1), i64::MIN);
    assert_eq!(i64::MIN.checked_div(-1), None);
    assert_eq!(7_i64.checked_div(2), Some(3));
    assert_eq!(1_i64.checked_div(0), None);
    let success: Result<i64, String> = Ok(-5);
    assert_eq!(success.map(|value| value.saturating_add(3)), Ok(-2));
    let failure: Result<i64, String> = Err("missing".to_string());
    assert_eq!(failure.map(|value| value.saturating_add(3)), Err("missing".to_string()));
    assert_eq!(Some(true).map(|flag| if flag { 1_i64 } else { -1_i64 }), Some(1));
    assert_eq!(Some(false).map(|flag| if flag { 1_i64 } else { -1_i64 }), Some(-1));
    fn descend(flag: bool) -> i64 { if flag { descend(false) } else { 1 } }
    assert_eq!(descend(true), 1);
    assert_eq!(descend(false), 1);
}
