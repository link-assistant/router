// Independent native Option oracle SOURCE. CI after all JavaScript gates only.
#[test]
fn option_callbacks_select_exactly_once_and_preserve_absence() {
    let mut calls = 0;
    let absent: Option<bool> = None;
    assert_eq!(absent.map(|_| { calls += 1; 4_u64 }), None);
    assert_eq!(calls, 0);
    assert_eq!(Some(true).map(|value| if value { 4_u64 } else { 2_u64 }), Some(4));
    assert_eq!(Some(false).and_then(|value| Some(if value { 7_u64 } else { 3_u64 })), Some(3));
    let absent: Option<u64> = None;
    assert_eq!(absent.unwrap_or_else(|| { calls += 1; 9 }), 9);
    assert_eq!(calls, 1);
    assert_eq!(Some(5_u64).unwrap_or_else(|| { calls += 1; 9 }), 5);
    assert_eq!(calls, 1);
    assert_eq!("xé😀".strip_prefix('x').map(|value| value.len() as u64), Some(6));
}
