// Independent local carrier/callback oracle SOURCE; gated Rust CI only.
use link_assistant_router::translation_primitive_option_core as option_core;
use link_assistant_router::translation_primitive_option_callbacks_core as callbacks;
use link_assistant_router::translation_primitive_results_core as result_core;
#[test]
fn option_aliases_and_constructor_domains_preserve_zero_none_and_boundaries() {
    for value in [None, Some(0_u64), Some(1), Some(u64::MAX)] {
        let alias = value;
        let chosen = alias.or(Some(3));
        let original = chosen.unwrap_or(9);
        let adopted_alias = value;
        let adopted_chosen = option_core::u64_or(adopted_alias, Some(3));
        assert_eq!(option_core::u64_unwrap_or(adopted_chosen, 9), original);
        let mapped = alias.map(|item| item);
        let adopted_mapped = callbacks::u64_to_u64_map(adopted_alias, |item| item);
        assert_eq!(mapped, adopted_mapped);
    }
    let empty: Option<u64> = None;
    let present: Option<u64> = Some(0);
    assert_eq!(option_core::u64_unwrap_or(empty, 9), 9);
    assert_eq!(option_core::u64_unwrap_or(present, 9), 0);
}
#[test]
fn result_aliases_keep_error_ownership_and_invoke_callback_once_only_for_ok() {
    for value in [Ok(0_u64), Ok(u64::MAX), Err("é😀".to_owned())] {
        let alias = value.clone();
        let mut original_calls = 0;
        let mapped = alias.map(|item| { original_calls += 1; item });
        let adopted_alias = value.clone();
        let mut adopted_calls = 0;
        let adopted_mapped = result_core::u64_to_u64_map(adopted_alias, |item| { adopted_calls += 1; item });
        assert_eq!(adopted_calls, original_calls);
        assert_eq!(adopted_calls, if value.is_ok() { 1 } else { 0 });
        assert_eq!(adopted_mapped, mapped);
        assert_eq!(result_core::u64_unwrap_or(adopted_mapped, 9), mapped.unwrap_or(9));
    }
    let failed: Result<u64, String> = Err("failure".to_owned());
    assert_eq!(result_core::u64_unwrap_or(failed, 9), 9);
}
