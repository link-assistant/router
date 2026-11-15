// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::needless_return)]
#![allow(clippy::useless_conversion)]
// Independent original carrier target oracle. UNRUN; gated CI only.
fn selected(value: &str, flag: bool) -> Result<String, String> {
    return if flag {
        Ok(value.into())
    } else {
        Err("error".into())
    };
}
#[test]
fn original_carrier_payload_contexts_and_borrowed_identity() {
    for value in ["", "é😀", "a\0b"] {
        assert_eq!(selected(value, true), Ok(value.to_owned()));
        assert_eq!(selected(value, false), Err("error".to_owned()));
        let optional: Option<String> = Some(value.into());
        assert_eq!(optional, Some(value.to_owned()));
        let borrowed: Option<&str> = Some(value.into());
        assert_eq!(borrowed, Some(value));
        let error: Result<u64, String> = Err(value.into());
        assert_eq!(error, Err(value.to_owned()));
    }
}
