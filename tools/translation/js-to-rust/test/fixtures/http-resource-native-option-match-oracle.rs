//! Independent original Option arm scoping and value expectations, CI only.
fn selected<T>(value: Option<T>) -> Option<T> {
    let payload = match value { Some(payload) => payload, None => return None };
    Some(payload)
}
#[test]
fn matched_payloads_move_once_and_absent_values_remain_absent() {
    assert_eq!(selected::<bool>(None), None);
    for flag in [false, true] { assert_eq!(selected(Some(flag)), Some(flag)); }
    for integer in [i64::MIN, 0, i64::MAX] { assert_eq!(selected(Some(integer)), Some(integer)); }
    assert_eq!(selected(Some(String::from("é😀"))), Some(String::from("é😀")));
}
