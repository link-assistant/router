//! Independent typed-local boundaries and scoped generic move source, CI only.
fn typed<T>(value: T) -> T { let value: T = value; value }
fn parity(value: bool) -> bool { let value: bool = !value; let value: bool = !value; value }
#[test]
fn original_annotations_keep_their_native_domains() {
    let maximum: u64 = u64::MAX;
    let positive: i64 = 1;
    let minimum: i64 = i64::MIN;
    assert_eq!(maximum, 18_446_744_073_709_551_615);
    assert!(positive > 0);
    assert_eq!(minimum, -9_223_372_036_854_775_808);
    for flag in [false, true] { assert_eq!(parity(flag), flag); }
    assert_eq!(typed(String::from("é😀")), "é😀");
    let bytes: Vec<u8> = vec![0, 255];
    assert_eq!(bytes, [0, 255]);
}
