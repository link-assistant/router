//! Independent native copy/owned storage oracle SOURCE. CI only; UNRUN.
use link_assistant_router::translation_text_core as owned;

#[test]
fn text_copy_matches_known_text_display_and_owned_clone_value_contracts() {
    for value in ["", "ASCII", "π😀é", "a\0b", "line\r\nend"] {
        let input = value.to_owned();
        assert_eq!(owned::to_owned(value), value.to_owned());
        assert_eq!(owned::to_owned(value), value.to_string());
        assert_eq!(owned::to_owned(&input), input.clone());
        if !value.is_empty() {
            let first = owned::to_owned(&input);
            let second = owned::to_owned(&input);
            assert_ne!(first.as_ptr(), input.as_ptr());
            assert_ne!(first.as_ptr(), second.as_ptr());
        }
    }
    assert_eq!(owned::to_owned("π😀\0"), "π😀\0");
    assert_eq!(owned::to_owned(r#"raw "quote""#), "raw \"quote\"");
}

#[test]
fn result_storage_remains_independent_after_source_mutation() {
    let mut source = "original".to_owned();
    let copy = owned::to_owned(&source);
    source.push('!');
    assert_eq!(source, "original!");
    assert_eq!(copy, "original");
}
