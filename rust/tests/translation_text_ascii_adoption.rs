//! Independent original/adopted caller oracle SOURCE. Gated CI only; UNRUN.
use link_assistant_router::translation_text_core as owned;

#[test]
fn exact_original_projection_and_owned_receiver_chains_match_explicit_calls() {
    for value in ["", "πABC", "HEADER", "α::β::γ", "\tvalue\u{000b} "] {
        assert_eq!(value.to_ascii_lowercase(), owned::to_ascii_lowercase(value));
        assert_eq!(value.to_ascii_uppercase(), owned::to_ascii_uppercase(value));
        assert_eq!(value.is_ascii(), owned::is_ascii(value));
        assert_eq!(value.trim_ascii(), owned::trim_ascii(value));
        assert_eq!(value.trim_ascii_start(), owned::trim_ascii_start(value));
        assert_eq!(value.trim_ascii_end(), owned::trim_ascii_end(value));
        assert_eq!(
            value.to_ascii_lowercase().contains("header"),
            owned::contains(&owned::to_ascii_lowercase(value), "header"),
        );
        let original_local = value.to_ascii_lowercase();
        let adopted_local = owned::to_ascii_lowercase(value);
        assert_eq!(
            original_local.contains("header"),
            owned::contains(&adopted_local, "header"),
        );
        for pattern in ["", "::", "!", "π"] {
            assert_eq!(
                value.split_once(pattern).map(|(left, _)| left),
                owned::split_once_left(value, pattern),
            );
            assert_eq!(
                value.split_once(pattern).map(|(_, right)| right),
                owned::split_once_right(value, pattern),
            );
            assert_eq!(
                value.rsplit_once(pattern).map(|(left, _)| left),
                owned::rsplit_once_left(value, pattern),
            );
            assert_eq!(
                value.rsplit_once(pattern).map(|(_, right)| right),
                owned::rsplit_once_right(value, pattern),
            );
            assert_eq!(
                value.eq_ignore_ascii_case(pattern),
                owned::eq_ignore_ascii_case(value, pattern),
            );
        }
    }
}
