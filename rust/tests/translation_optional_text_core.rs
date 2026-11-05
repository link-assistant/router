//! Independent optional text oracle SOURCE; CI-only after all JS gates, UNRUN.
use link_assistant_router::translation_primitive_option_core as option;
#[test]
fn standard_owned_operations_keep_empty_presence_and_eager_values() {
    for value in [None,Some(String::new()),Some(String::from(" é😀 ")),Some(String::from("\u{85}\u{a0}\u{200a}\u{3000}")),Some(String::from("\u{feff}")),Some(String::from("\u{180e}")),Some(String::from("\0"))] {
        for mode in [false,true] {
            let expected = value.clone().filter(|text| if mode { !text.trim().is_empty() } else { !text.is_empty() });
            assert_eq!(option::text_owned_filter_nonempty(value.clone(),mode),expected);
            let borrowed = value.as_deref();
            let expected_borrowed = borrowed.filter(|text| if mode { !text.trim().is_empty() } else { !text.is_empty() });
            let selected = option::str_filter_nonempty(borrowed,mode);
            assert_eq!(selected,expected_borrowed);
            if let (Some(actual),Some(original)) = (selected,expected_borrowed) { assert_eq!(actual.as_ptr(),original.as_ptr()); }
        }
        assert_eq!(option::text_owned_unwrap_or_default(value.clone()),value.clone().unwrap_or_default());
        assert_eq!(option::text_owned_unwrap_or(value.clone(),String::from("fallback")),value.clone().unwrap_or(String::from("fallback")));
        for other in [None,Some(String::new()),Some(String::from("é😀"))] {
            assert_eq!(option::text_owned_and(value.clone(),other.clone()),value.clone().and(other.clone()));
            assert_eq!(option::text_owned_or(value.clone(),other.clone()),value.clone().or(other.clone()));
        }
    }
    assert_eq!(option::text_owned_some(String::new()),Some(String::new()));
    assert_eq!(option::text_owned_none(),None);
}
#[test]
fn filtering_retains_the_original_owned_allocation() {
    let input = String::from(" é😀 ");let pointer = input.as_ptr();
    let selected = option::text_owned_filter_nonempty(Some(input),true).unwrap();
    assert_eq!(selected.as_ptr(),pointer);assert_eq!(selected," é😀 ");
}
#[test]
#[should_panic(expected = "primitive Option text input bound")]
fn owned_filter_keeps_the_original_text_bound() {
    let _ = option::text_owned_filter_nonempty(Some("é".repeat(524289)),false);
}
#[test]
#[should_panic(expected = "native message é😀")]
fn owned_expect_retains_the_native_message() { let _ = option::text_owned_expect(None,"native message é😀"); }
