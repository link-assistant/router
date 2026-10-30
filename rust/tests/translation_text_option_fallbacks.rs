//! Independent native Option fallback/borrow oracle SOURCE. CI only; UNRUN.
use link_assistant_router::translation_text_core as owned;

#[test]
fn total_fallbacks_keep_native_empty_match_missing_match_overlap_and_unicode() {
    for value in ["", "models/😀", "thing.json", "a::b::c", "ababa", "α😀β😀γ", "a\0b"] {
        for pattern in ["", "models/", ".json", "::", "aba", "😀", "\0", "missing"] {
            assert_eq!(value.strip_prefix(pattern).unwrap_or(value), owned::strip_prefix_or_self(value, pattern));
            assert_eq!(value.strip_prefix(pattern).unwrap_or_default(), owned::strip_prefix_or_empty(value, pattern));
            assert_eq!(value.strip_suffix(pattern).unwrap_or(value), owned::strip_suffix_or_self(value, pattern));
            assert_eq!(value.strip_suffix(pattern).unwrap_or_default(), owned::strip_suffix_or_empty(value, pattern));
            assert_eq!(value.split_once(pattern).map(|(left, _)| left).unwrap_or(value), owned::split_once_left_or_self(value, pattern));
            assert_eq!(value.split_once(pattern).map(|(left, _)| left).unwrap_or_default(), owned::split_once_left_or_empty(value, pattern));
            assert_eq!(value.split_once(pattern).map(|(_, right)| right).unwrap_or(value), owned::split_once_right_or_self(value, pattern));
            assert_eq!(value.split_once(pattern).map(|(_, right)| right).unwrap_or_default(), owned::split_once_right_or_empty(value, pattern));
            assert_eq!(value.rsplit_once(pattern).map(|(left, _)| left).unwrap_or(value), owned::rsplit_once_left_or_self(value, pattern));
            assert_eq!(value.rsplit_once(pattern).map(|(left, _)| left).unwrap_or_default(), owned::rsplit_once_left_or_empty(value, pattern));
            assert_eq!(value.rsplit_once(pattern).map(|(_, right)| right).unwrap_or(value), owned::rsplit_once_right_or_self(value, pattern));
            assert_eq!(value.rsplit_once(pattern).map(|(_, right)| right).unwrap_or_default(), owned::rsplit_once_right_or_empty(value, pattern));
        }
    }
    assert_eq!(owned::split_once_left_or_self("abc", ""), "");
    assert_eq!(owned::rsplit_once_right_or_self("abc", ""), "");
    assert_eq!(owned::split_once_right_or_empty("ababa", "aba"), "ba");
    assert_eq!(owned::rsplit_once_left_or_empty("ababa", "aba"), "ab");
    assert_eq!(owned::strip_prefix_or_self("model", "models/"), "model");
    assert_eq!(owned::strip_prefix_or_empty("model", "models/"), "");
}

#[test]
fn result_borrows_input_without_retaining_temporary_pattern_storage() {
    let value = "models/😀".to_owned();
    let result = {
        let pattern = "models/".to_owned();
        owned::strip_prefix_or_self(&value, &pattern)
    };
    assert_eq!(result, "😀");
    assert_eq!(result.as_ptr(), value[7..].as_ptr());
    let fallback = {
        let pattern = "missing".to_owned();
        owned::strip_prefix_or_self(&value, &pattern)
    };
    assert_eq!(fallback.as_ptr(), value.as_ptr());
}
