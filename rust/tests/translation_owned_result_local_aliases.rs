// Independent owned Result alias/constructor/capture oracle SOURCE; CI only.
use link_assistant_router::translation_owned_results_core as core;
#[test]
fn selected_result_aliases_preserve_native_owned_values_and_error_branches() {
    for value in [Ok(String::new()), Ok("é😀".to_owned()), Err("failure".to_owned())] {
        let alias = value.clone();
        let mapped = alias.map(|item| item);
        let original = mapped.unwrap_or("fallback".to_owned());
        let adopted_alias = value;
        let adopted_mapped = core::text_to_text_map(adopted_alias, |item| item);
        let adopted = core::text_unwrap_or(adopted_mapped, "fallback".to_owned());
        assert_eq!(adopted, original);
    }
    let created: Result<String, String> = Ok("é😀".to_owned());
    assert_eq!(core::text_unwrap(created), "é😀");
    let failed: Result<String, String> = Err("failure".to_owned());
    assert_eq!(core::text_unwrap_or(failed, "fallback".to_owned()), "fallback");
}
#[test]
fn captured_owned_payload_is_moved_once_and_only_the_ok_callback_runs() {
    for value in [Ok(String::new()), Ok("é😀".to_owned()), Err("failure".to_owned())] {
        let fallback = "captured".to_owned();
        let alias = value.clone();
        let mut original_calls = 0;
        let original = alias.map(|_item| { original_calls += 1; fallback });
        let adopted_fallback = "captured".to_owned();
        let adopted_alias = value;
        let mut adopted_calls = 0;
        let adopted = core::text_to_text_map(adopted_alias, |_item| { adopted_calls += 1; adopted_fallback });
        assert_eq!(adopted_calls, original_calls);
        assert_eq!(adopted, original);
    }
}
