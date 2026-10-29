// Independent borrowed text input oracles. CI ONLY; ALL UNRUN.
fn counts(text: &str) -> Vec<u64> { vec![text.chars().count() as u64] }
fn values(text: &str, alphabet: &str, flag: bool) -> Vec<bool> {
    vec![text.chars().all(|character| character.is_ascii() && alphabet.contains(character)), text == alphabet, flag]
}
#[test]
fn borrowed_text_count_and_ascii_membership_retain_unicode_semantics() {
    assert_eq!(counts("a😀é"), vec![3]);
    assert_eq!(counts("a\u{301}"), vec![2]);
    assert_eq!(counts("\0"), vec![1]);
    assert_eq!(values("cba", "abc", false), vec![true, false, false]);
    assert_eq!(values("é", "é", true), vec![false, true, true]);
}
#[test]
fn static_branch_and_immutable_alias_do_not_return_a_borrow() {
    fn selected(text: &str, flag: bool) -> Vec<u64> {
        let alias = text;
        let selected = if flag { alias } else { "" };
        vec![selected.chars().count() as u64]
    }
    assert_eq!(selected("a😀é", true), vec![3]);
    assert_eq!(selected("a😀é", false), vec![0]);
}
