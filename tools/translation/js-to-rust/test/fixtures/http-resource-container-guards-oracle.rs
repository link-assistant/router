// Independent native source; execution requires all same-SHA JavaScript stages.
fn optional(value: Option<i64>) -> Option<i64> {
    value
}

fn outcome(value: Result<i64, String>) -> Result<i64, String> {
    value
}

#[test]
fn signed_container_payloads_preserve_native_boundaries_and_other_constructors() {
    for value in [i64::MIN, -1, 0, i64::MAX] {
        assert_eq!(optional(Some(value)), Some(value));
        assert_eq!(outcome(Ok(value)), Ok(value));
    }
    assert_eq!(optional(None), None);
    assert_eq!(outcome(Err(String::from("missing"))), Err(String::from("missing")));
    assert!(i64::try_from(i128::from(i64::MAX) + 1).is_err());
    assert!(i64::try_from(i128::from(i64::MIN) - 1).is_err());
}
