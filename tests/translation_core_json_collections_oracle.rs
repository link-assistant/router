//! Independent native oracle; run only in the gated same-SHA Rust CI job.
use link_assistant_router::translation_core::{
    json_copy, json_filter_map, json_map, json_with_field,
};
use serde_json::{Value, json};
use std::cell::RefCell;

#[test]
fn map_empty_single_and_ordered_owned_results() {
    assert_eq!(json_map(&[], json_copy), Vec::<Value>::new());
    let input = vec![json!(null), json!({"text": "猫😀"}), json!([true])];
    let before = input.clone();
    assert_eq!(json_map(&input, json_copy), before);
    assert_eq!(input, before);
}

#[test]
fn filter_map_visits_none_inputs_and_preserves_some_order() {
    let input = vec![json!(0), json!(1), json!(2)];
    let events = RefCell::new(Vec::new());
    let output = json_filter_map(&input, |value| {
        events.borrow_mut().push(value.as_i64().unwrap());
        if value == &json!(1) {
            None
        } else {
            Some(json_copy(value))
        }
    });
    assert_eq!(*events.borrow(), vec![0, 1, 2]);
    assert_eq!(output, vec![json!(0), json!(2)]);
}

#[test]
fn callback_owns_fresh_conditional_update_state() {
    let input = vec![json!(null), json!({"data": ["😀", true]}), json!({})];
    let before = input.clone();
    let output = json_filter_map(&input, |value| {
        if value.is_null() {
            return None;
        }
        let mut doc = json!({"start": true});
        if let Some(data) = value.get("data") {
            doc = json_with_field(doc, "data", json_copy(data));
        }
        Some(doc)
    });
    assert_eq!(output, vec![json!({"start": true, "data": ["😀", true]}), json!({"start": true})]);
    assert_eq!(input, before);
}

#[test]
fn borrowed_captures_remain_available_after_collection() {
    let input = vec![json!(true), json!(false)];
    let fallback = json!({"text": "Ω"});
    let output = json_map(&input, |_| json_copy(&fallback));
    assert_eq!(output, vec![fallback.clone(), fallback.clone()]);
    assert_eq!(fallback, json!({"text": "Ω"}));
    assert_eq!(input, vec![json!(true), json!(false)]);
}

#[test]
fn callback_panic_stops_before_later_rows() {
    let input = vec![json!(0), json!(1), json!(2)];
    let events = RefCell::new(Vec::new());
    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        json_map(&input, |value| {
            let number = value.as_i64().unwrap();
            events.borrow_mut().push(number);
            assert_ne!(number, 1, "independent callback stop");
            json_copy(value)
        })
    }));
    assert!(outcome.is_err());
    assert_eq!(*events.borrow(), vec![0, 1]);
}

#[test]
fn canonical_option_expansion_preserves_payload_and_default() {
    let input = vec![json!({"image": {"url": "猫"}}), json!({"image": {"url": true}}), json!({})];
    let original = json_map(&input, |value| {
        let text = value.get("image").and_then(|image| image.get("url")).and_then(Value::as_str).unwrap_or("fallback");
        json!({"text": text})
    });
    let explicit = json_map(&input, |value| {
        let image = value.get("image");
        let url = if let Some(image) = image { image.get("url") } else { None };
        let text = if let Some(url) = url { Value::as_str(url) } else { None };
        let default = "fallback";
        let text = if let Some(text) = text { text } else { default };
        json!({"text": text})
    });
    assert_eq!(original, explicit);
    assert_eq!(explicit, vec![json!({"text": "猫"}), json!({"text": "fallback"}), json!({"text": "fallback"})]);
}

#[test]
fn unwrap_default_evaluates_after_subject_even_for_some() {
    let events = RefCell::new(Vec::new());
    let subject = || {
        events.borrow_mut().push("receiver");
        Some("present")
    };
    let fallback = || {
        events.borrow_mut().push("fallback");
        "missing"
    };
    assert_eq!(subject().unwrap_or(fallback()), "present");
    assert_eq!(*events.borrow(), vec!["receiver", "fallback"]);
}

#[test]
fn outputs_own_independent_storage() {
    let input = vec![json!({"nested": ["猫", true]})];
    let mut first = json_map(&input, json_copy);
    let second = json_map(&input, json_copy);
    first[0]["nested"][0] = json!("changed");
    assert_eq!(input, vec![json!({"nested": ["猫", true]})]);
    assert_eq!(second, input);
}
