//! Independent native pattern oracle SOURCE. CI after same-SHA JS; UNRUN.
use link_assistant_router::translation_text_core as owned;

#[test]
fn native_character_patterns_match_single_scalar_string_contracts() {
    for value in ["", "a=b=c", "a-b-c", "'é\\", "😀é😀", "a\0b", "a\nb\nc", "\u{7f}"] {
        assert_eq!(value.contains('\0'), owned::contains(value, "\u{0}"));
        assert_eq!(value.contains('\x7f'), owned::contains(value, "\u{7f}"));
        assert_eq!(value.starts_with('\''), owned::starts_with(value, "\u{27}"));
        assert_eq!(value.ends_with('\\'), owned::ends_with(value, "\u{5c}"));
        assert_eq!(value.strip_prefix('\''), owned::strip_prefix(value, "\u{27}"));
        assert_eq!(value.strip_suffix('\\'), owned::strip_suffix(value, "\u{5c}"));
        assert_eq!(value.replace('😀', "$&"), owned::replace(value, "\u{1f600}", "$&"));
        assert_eq!(value.replacen('\n', "|", 1), owned::replacen(value, "\u{a}", "|", 1));
        assert_eq!(value.matches('\u{1_f600}').count() as u64, owned::matches_count(value, "\u{1f600}"));
        assert_eq!(value.split_once('=').map(|(left, _)| left), owned::split_once_left(value, "\u{3d}"));
        assert_eq!(value.rsplit_once('-').map(|(_, right)| right), owned::rsplit_once_right(value, "\u{2d}"));
    }
    assert_eq!(owned::replace("😀é😀", "😀", "$&"), "$&é$&");
    assert_eq!(owned::matches_count("😀é😀", "😀"), 2);
    assert_eq!(owned::split_once_left("a=b=c", "="), Some("a"));
    assert_eq!(owned::rsplit_once_right("a-b-c", "-"), Some("c"));
}
