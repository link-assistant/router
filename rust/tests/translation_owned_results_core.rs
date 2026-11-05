//! Independent owned-success Result oracle source, restricted to gated Rust CI.
use link_assistant_router::translation_owned_results_core as result;

#[test]
fn owned_success_is_not_an_empty_error_or_optional_absence() {
    assert_eq!(result::text_ok(String::new()), Ok(String::new()));
    assert_eq!(result::text_err(""), Err(String::new()));
    assert_eq!(result::text_ok_option(Ok(String::new())), Some(String::new()));
    assert_eq!(result::text_ok_option(Err(String::new())), None);
    assert_eq!(result::text_err_option(Err(String::new())), Some(String::new()));
    assert_eq!(result::text_unwrap_or(Ok(String::new()), "unused".to_owned()), "");
    assert_eq!(result::text_unwrap_or(Err("old".to_owned()), "é😀".to_owned()), "é😀");
    assert_eq!(result::bool_to_text_map(Ok(false), |_| String::new()), Ok(String::new()));
    assert_eq!(result::text_to_i64_map(Ok("é😀".to_owned()), |_| i64::MIN), Ok(i64::MIN));
}

#[test]
fn owned_callbacks_consume_success_but_return_captured_borrows_independently() {
    let captured = "retained😀".to_owned();
    let output = result::text_to_str_map(Ok("short owned input".to_owned()), |_| captured.as_str());
    assert_eq!(output, Ok("retained😀"));
    assert_eq!(result::str_to_text_map(Ok("borrowed😀"), str::to_owned), Ok("borrowed😀".to_owned()));
    assert_eq!(result::text_to_text_and_then(Ok(String::new()), |_| Err("next".to_owned())), Err("next".to_owned()));
    assert_eq!(result::text_unwrap_or_else(Ok(String::new()), |_| panic!("unselected")), "");
    assert_eq!(result::text_map_err(Err("old".to_owned()), |mut error| { error.push('!'); error }), Err("old!".to_owned()));
    assert_eq!(result::text_or_else(Err("old".to_owned()), |_| Ok(String::new())), Ok(String::new()));
}

#[test]
#[should_panic(expected = "bound")]
fn owned_success_text_keeps_the_utf8_resource_boundary() {
    let _ = result::text_ok("é".repeat(524_289));
}
