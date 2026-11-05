//! Independent optional owning callback oracle SOURCE. CI-only after all JS gates; UNRUN.
use link_assistant_router::translation_primitive_option_callbacks_core as core;
use std::cell::Cell;

#[test]
fn bool_to_text_owned_map_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(false) } else { None };
        let calls = Cell::new(0);
        let actual = core::bool_to_text_owned_map(value.clone(),|_item| {calls.set(calls.get()+1);String::from("owned😀")});
        let expected = value.map(|_item| { String::from("owned😀") });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn bool_to_text_owned_and_then_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(false) } else { None };
        let calls = Cell::new(0);
        let actual = core::bool_to_text_owned_and_then(value.clone(),|_item| {calls.set(calls.get()+1);Some(String::from("owned😀"))});
        let expected = value.and_then(|_item| { Some(String::from("owned😀")) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn u64_to_text_owned_map_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(u64::MAX) } else { None };
        let calls = Cell::new(0);
        let actual = core::u64_to_text_owned_map(value.clone(),|_item| {calls.set(calls.get()+1);String::from("owned😀")});
        let expected = value.map(|_item| { String::from("owned😀") });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn u64_to_text_owned_and_then_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(u64::MAX) } else { None };
        let calls = Cell::new(0);
        let actual = core::u64_to_text_owned_and_then(value.clone(),|_item| {calls.set(calls.get()+1);Some(String::from("owned😀"))});
        let expected = value.and_then(|_item| { Some(String::from("owned😀")) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn i64_to_text_owned_map_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(i64::MIN) } else { None };
        let calls = Cell::new(0);
        let actual = core::i64_to_text_owned_map(value.clone(),|_item| {calls.set(calls.get()+1);String::from("owned😀")});
        let expected = value.map(|_item| { String::from("owned😀") });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn i64_to_text_owned_and_then_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(i64::MIN) } else { None };
        let calls = Cell::new(0);
        let actual = core::i64_to_text_owned_and_then(value.clone(),|_item| {calls.set(calls.get()+1);Some(String::from("owned😀"))});
        let expected = value.and_then(|_item| { Some(String::from("owned😀")) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn str_to_text_owned_map_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(" input😀 ") } else { None };
        let calls = Cell::new(0);
        let actual = core::str_to_text_owned_map(value.clone(),|_item| {calls.set(calls.get()+1);String::from("owned😀")});
        let expected = value.map(|_item| { String::from("owned😀") });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn str_to_text_owned_and_then_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(" input😀 ") } else { None };
        let calls = Cell::new(0);
        let actual = core::str_to_text_owned_and_then(value.clone(),|_item| {calls.set(calls.get()+1);Some(String::from("owned😀"))});
        let expected = value.and_then(|_item| { Some(String::from("owned😀")) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_to_bool_map_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_to_bool_map(value.clone(),|_item| {calls.set(calls.get()+1);false});
        let expected = value.map(|_item| { false });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_to_bool_and_then_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_to_bool_and_then(value.clone(),|_item| {calls.set(calls.get()+1);Some(false)});
        let expected = value.and_then(|_item| { Some(false) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_to_u64_map_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_to_u64_map(value.clone(),|_item| {calls.set(calls.get()+1);u64::MAX});
        let expected = value.map(|_item| { u64::MAX });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_to_u64_and_then_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_to_u64_and_then(value.clone(),|_item| {calls.set(calls.get()+1);Some(u64::MAX)});
        let expected = value.and_then(|_item| { Some(u64::MAX) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_to_i64_map_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_to_i64_map(value.clone(),|_item| {calls.set(calls.get()+1);i64::MIN});
        let expected = value.map(|_item| { i64::MIN });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_to_i64_and_then_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_to_i64_and_then(value.clone(),|_item| {calls.set(calls.get()+1);Some(i64::MIN)});
        let expected = value.and_then(|_item| { Some(i64::MIN) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_to_text_owned_map_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_to_text_owned_map(value.clone(),|_item| {calls.set(calls.get()+1);String::from("owned😀")});
        let expected = value.map(|_item| { String::from("owned😀") });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_to_text_owned_and_then_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_to_text_owned_and_then(value.clone(),|_item| {calls.set(calls.get()+1);Some(String::from("owned😀"))});
        let expected = value.and_then(|_item| { Some(String::from("owned😀")) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != false {1} else {0});
    }
}

#[test]
fn text_owned_unwrap_or_else_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_unwrap_or_else(value.clone(),|| {calls.set(calls.get()+1);String::from("owned😀")});
        let expected = value.unwrap_or_else(|| { String::from("owned😀") });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != true {1} else {0});
    }
}

#[test]
fn text_owned_or_else_matches_standard_and_calls_once_only_on_selected_branch() {
    for present in [false,true] {
        let value = if present { Some(String::from(" input😀 ")) } else { None };
        let calls = Cell::new(0);
        let actual = core::text_owned_or_else(value.clone(),|| {calls.set(calls.get()+1);Some(String::from("owned😀"))});
        let expected = value.or_else(|| { Some(String::from("owned😀")) });
        assert_eq!(actual,expected);
        assert_eq!(calls.get(),if present != true {1} else {0});
    }
}

#[test]
fn identity_map_and_unselected_recovery_retain_owned_storage() {
    let value=String::from(" é😀 ");let pointer=value.as_ptr();
    let selected=core::text_owned_to_text_owned_map(Some(value),|value|value).unwrap();
    assert_eq!(selected.as_ptr(),pointer);
    let pointer=selected.as_ptr();let selected=core::text_owned_or_else(Some(selected),||panic!("unselected callback")).unwrap();assert_eq!(selected.as_ptr(),pointer);
    let pointer=selected.as_ptr();let selected=core::text_owned_unwrap_or_else(Some(selected),||panic!("unselected fallback"));assert_eq!(selected.as_ptr(),pointer);
}
