//! Independent native Result oracle source. Local Rust execution is prohibited.
use link_assistant_router::translation_primitive_results_core as result;
use std::cell::Cell;

#[test]
fn scalar_boundaries_and_tagged_absence_remain_distinct() {
    assert_eq!(result::bool_ok(false), Ok(false));
    assert_eq!(result::u64_ok(u64::MAX), Ok(u64::MAX));
    assert_eq!(result::i64_ok(i64::MIN), Ok(i64::MIN));
    assert_eq!(result::str_ok(""), Ok(""));
    assert_eq!(result::str_err(""), Err(String::new()));
    assert_eq!(result::u64_ok_option(Ok(0)), Some(0));
    assert_eq!(result::u64_ok_option(Err(String::new())), None);
    assert_eq!(result::bool_err_option(Err(String::new())), Some(String::new()));
    assert_eq!(result::bool_err_option(Ok(false)), None);
    assert!(!result::bool_is_ok(Err(String::new())));
    assert!(!result::bool_is_err(Ok(false)));
    assert_eq!(result::u64_unwrap_or(Err("fault".to_owned()), u64::MAX), u64::MAX);
    assert_eq!(result::i64_unwrap(Ok(i64::MIN)), i64::MIN);
    assert_eq!(result::str_unwrap_or(Ok(""), "fallback"), "");
    assert_eq!(result::str_unwrap_or(Err(String::new()), "é😀"), "é😀");
    assert_eq!(result::str_unwrap_err(Err("é😀".to_owned())), "é😀");
}

#[test]
fn callback_laziness_capture_regions_and_error_ownership() {
    let calls = Cell::new(0);
    assert_eq!(result::u64_to_bool_map(Err("fault".to_owned()), |_| {
        calls.set(calls.get() + 1);
        false
    }), Err("fault".to_owned()));
    assert_eq!(calls.get(), 0);
    assert_eq!(result::bool_to_u64_map(Ok(false), |_| {
        calls.set(calls.get() + 1);
        u64::MAX
    }), Ok(u64::MAX));
    assert_eq!(calls.get(), 1);
    let captured = "retained😀".to_owned();
    let mapped;
    {
        let input = "short input".to_owned();
        mapped = result::str_to_str_map(Ok(input.as_str()), |_| captured.as_str());
    }
    assert_eq!(mapped, Ok("retained😀"));
    assert_eq!(result::i64_to_u64_and_then(Ok(-1), |_| Err("next".to_owned())), Err("next".to_owned()));
    assert_eq!(result::u64_unwrap_or_else(Ok(0), |_| panic!("unselected")), 0);
    assert_eq!(result::str_unwrap_or_else(Err("old".to_owned()), |_| captured.as_str()), "retained😀");
    assert_eq!(result::bool_map_err(Err("old".to_owned()), |mut error| { error.push('!'); error }), Err("old!".to_owned()));
    assert_eq!(result::bool_or_else(Ok(false), |_| panic!("unselected")), Ok(false));
    assert_eq!(result::bool_or_else(Err("old".to_owned()), |_| Ok(false)), Ok(false));
}

#[test]
#[should_panic(expected = "requested")]
fn explicit_expect_message_remains_the_error_boundary() {
    let _ = result::u64_expect(Err("old".to_owned()), "requested");
}

#[test]
#[should_panic(expected = "bound")]
fn error_inputs_retain_the_utf8_resource_boundary() {
    let _ = result::bool_is_ok(Err("é".repeat(524_289)));
}
