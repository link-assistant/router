// Independent native source. Only fatal JavaScript-gated Rust CI may run it.
fn dispatch(value: &str) -> u64 {
    match value {
        "GET" | "HEAD" => 1,
        "POST" => 2,
        "é😀" => 3,
        _ => 0,
    }
}

#[test]
fn complete_scalar_dispatch_preserves_stacked_cases_and_default() {
    assert_eq!(dispatch("GET"), 1);
    assert_eq!(dispatch("HEAD"), 1);
    assert_eq!(dispatch("POST"), 2);
    assert_eq!(dispatch("é😀"), 3);
    assert_eq!(dispatch("other"), 0);
}
