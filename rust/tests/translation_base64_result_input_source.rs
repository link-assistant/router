// Independent native owned Base64 input oracle. UNRUN; gated Rust CI only.
use link_assistant_router::translation_core::Base64Error;
fn identity(value: Result<Vec<u8>, Base64Error>) -> Result<Vec<u8>, Base64Error> {
    if let Ok(bytes) = &value { assert!(bytes.len() <= 1_048_576); }
    value
}
#[test]
fn owned_result_inputs_preserve_native_storage_moves_and_errors() {
    let mut bytes = Vec::with_capacity(64);
    bytes.extend_from_slice(&[0, 102, 255]);
    let pointer = bytes.as_ptr();
    let capacity = bytes.capacity();
    let result = identity(Ok(bytes)).expect("known bytes");
    assert_eq!(result, [0, 102, 255]);
    assert_eq!(result.as_ptr(), pointer);
    assert_eq!(result.capacity(), capacity);
    assert!(matches!(identity(Err(Base64Error::InvalidPadding)), Err(Base64Error::InvalidPadding)));
    assert!(matches!(identity(Err(Base64Error::InvalidLength(0))), Err(Base64Error::InvalidLength(0))));
    assert!(std::panic::catch_unwind(|| identity(Ok(vec![0; 1_048_577]))).is_err());
}
