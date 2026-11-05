// Independent typed carrier result-chain oracle SOURCE. Gated Rust CI only.
use link_assistant_router::{translation_primitive_option_core as option, translation_primitive_option_callbacks_core as callbacks, translation_primitive_results_core as result, translation_owned_results_core as owned};
#[test]
fn typed_option_and_primitive_result_chains_keep_empty_zero_and_boundaries() {
    for value in [None, Some(0_u64), Some(1), Some(u64::MAX)] {
        let alias: Option<u64> = value;
        let selected: Option<u64> = alias.map(|item| item);
        let adopted: Option<u64> = callbacks::u64_to_u64_map(value, |item| item);
        assert_eq!(option::u64_unwrap_or(adopted, 9), selected.unwrap_or(9));
        let combined: Option<u64> = alias.or(Some(0));
        assert_eq!(option::u64_unwrap_or(option::u64_or(value, Some(0)), 9), combined.unwrap_or(9));
    }
    for value in [Ok(0_u64), Ok(u64::MAX), Err("é😀".to_owned())] {
        let alias: Result<u64, String> = value.clone();
        let selected: Result<u64, String> = alias.map(|item| item);
        let adopted: Result<u64, String> = result::u64_to_u64_map(value, |item| item);
        assert_eq!(result::u64_unwrap_or(adopted, 9), selected.unwrap_or(9));
    }
}
#[test]
fn typed_owned_result_chains_keep_empty_text_unicode_and_error_fallbacks() {
    for value in [Ok(String::new()), Ok("é😀".to_owned()), Err("failure".to_owned())] {
        let alias: Result<String, String> = value.clone();
        let selected: Result<String, String> = alias.map(|item| item);
        let adopted: Result<String, String> = owned::text_to_text_map(value, |item| item);
        assert_eq!(owned::text_unwrap_or(adopted, "fallback".to_owned()), selected.unwrap_or("fallback".to_owned()));
    }
}
