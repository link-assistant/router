// Independent native source. Only fatal JavaScript-gated Rust CI may run it.
fn identity<T>(value: T) -> T {
    value
}

#[test]
fn generic_identity_preserves_moves_and_shared_borrow_origins() {
    let value = String::from("é😀");
    let moved = identity(value);
    assert_eq!(moved, "é😀");
    let borrowed = identity(moved.as_str());
    assert_eq!(borrowed, "é😀");
    assert_eq!(identity(vec![1_u64, 2]), vec![1, 2]);
    assert_eq!(Some(3_u64).map(identity), Some(3));
    assert_eq!(identity(i64::MIN), i64::MIN);
}
