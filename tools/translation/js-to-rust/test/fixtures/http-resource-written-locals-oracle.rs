//! Independent original written-local type and behavior oracle. Gated CI only.
fn absent() -> Option<bool> { let value: Option<bool> = None; value }
fn nested() -> Option<Option<bool>> { let value: Option<Option<bool>> = Some(None); value }
fn selected(flag: bool) -> Option<bool> {
    let value: Option<bool> = if flag { None } else { Some(true) };
    value
}
fn outcome(flag: bool, payload: bool, error: String) -> Result<bool, String> {
    let value: Result<bool, String> = if flag { Ok(payload) } else { Err(error) };
    value
}
#[test]
fn original_contextual_locals_keep_empty_nested_success_and_failure_values() {
    assert_eq!(absent(), None);
    assert_eq!(nested(), Some(None));
    assert_eq!(selected(true), None);
    assert_eq!(selected(false), Some(true));
    for payload in [false, true] {
        assert_eq!(outcome(true, payload, String::from("unused")), Ok(payload));
    }
    for message in ["", "é😀", "\0"] {
        assert_eq!(outcome(false, true, String::from(message)), Err(String::from(message)));
    }
}
