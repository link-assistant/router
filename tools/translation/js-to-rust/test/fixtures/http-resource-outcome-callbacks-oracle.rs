// Independent native Result oracle SOURCE. CI after every JavaScript gate only.
#[test]
fn result_callbacks_preserve_once_only_selection_and_owning_errors() {
    let mut calls = 0;
    let failure: Result<bool, String> = Err("é😀".into());
    let unchanged = failure.map(|_| { calls += 1; 4_u64 });
    assert_eq!(unchanged, Err("é😀".to_string()));
    assert_eq!(calls, 0);
    let success: Result<bool, String> = Ok(true);
    assert_eq!(success.map(|value| if value { 4_u64 } else { 2_u64 }), Ok(4));
    let owning_error: Result<String, String> = Err("bad bad".into());
    assert_eq!(owning_error.map_err(|error| error.replace("bad", "é😀")), Err("é😀 é😀".into()));
    let recovered: Result<String, String> = Err("ignored".into());
    assert_eq!(recovered.unwrap_or_else(|_| "fallback".to_string()), "fallback");
    let size: Result<String, String> = Ok("é😀".into());
    assert_eq!(size.map(|value| value.len() as u64), Ok(6));
    let chained: Result<u64, String> = Ok(u64::MAX);
    assert_eq!(chained.and_then(|value| Ok(value.saturating_add(1))), Ok(u64::MAX));
}
