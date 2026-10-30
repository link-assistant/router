// Independent qualified scalar Option/Result oracle. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
fn fallback(value: Option<scalar::U64>) -> scalar::U64 { value.unwrap_or(9) }
fn identity(value: Option<scalar::U64>) -> Option<scalar::U64> { value.map(|item| item) }
fn changed(value: Result<String, String>, flag: scalar::Bool) -> Result<scalar::Bool, String> { value.map(|_item| flag) }
#[test]
fn qualified_scalar_carrier_payloads_preserve_native_extremes_and_branches() {
    assert_eq!(fallback(None), 9);
    assert_eq!(fallback(Some(u64::MAX)), u64::MAX);
    assert_eq!(identity(None), None);
    assert_eq!(identity(Some(u64::MAX)), Some(u64::MAX));
    assert_eq!(changed(Ok(String::from("payload")), false), Ok(false));
    assert_eq!(changed(Err(String::from("oops")), true), Err(String::from("oops")));
    let value: Result<scalar::I64, String> = Ok(i64::MIN);
    assert_eq!(value.unwrap_or(0), i64::MIN);
}
