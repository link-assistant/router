//! Independent original Result arm scope/value/error source. Gated CI only.
fn selected<T, E>(value: Result<T, E>) -> Result<T, E> {
    let payload = match value { Ok(payload) => payload, Err(error) => return Err(error) };
    Ok(payload)
}
#[test]
fn successful_values_and_owned_errors_keep_their_original_payloads() {
    for flag in [false, true] { assert_eq!(selected::<_, String>(Ok(flag)), Ok(flag)); }
    for text in ["", "é😀", "unavailable"] {
        assert_eq!(selected::<bool, _>(Err(String::from(text))), Err(String::from(text)));
    }
    assert_eq!(selected::<_, String>(Ok(String::from("owned"))), Ok(String::from("owned")));
}
