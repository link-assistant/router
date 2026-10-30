//! Independent paired owned String Vec oracle SOURCE. CI only, UNRUN.
//! The actual public crate edge is used; all execution remains UNRUN.
use link_assistant_router::translation_owned_text_vectors_core as core;

#[test]
fn owned_text_operations_match_independent_standard_vec_results() {
    let original = vec![String::new(), String::from("λ😀"), String::from("a\0b")];
    let copied = core::vec_text_from_slice(&original);
    assert_eq!(copied, original);
    assert_eq!(core::vec_text_len(&copied), 3);
    let selected = core::vec_text_get(&copied, 1).expect("owned copy");
    let replaced = core::vec_text_replace(copied, 1, String::from("changed"));
    assert_eq!(selected, "λ😀");
    assert_eq!(original[1], "λ😀");
    assert_eq!(replaced, vec![String::new(), String::from("changed"), String::from("a\0b")]);
    assert_eq!(core::vec_text_get(&replaced, u64::MAX), None);
    assert_eq!(core::vec_text_get(&replaced, 3), None);
    assert_eq!(core::vec_text_get(&replaced, 0), Some(String::new()));
    let pushed = core::vec_text_push(replaced, String::from("tail"));
    let appended = core::vec_text_append(pushed, vec![String::from("last"), String::new()]);
    assert_eq!(appended.last(), Some(&String::new()));
    assert_eq!(core::vec_text_len(&appended), 6);
    assert_eq!(core::vec_text_truncate(appended.clone(), u64::MAX), appended);
    assert_eq!(core::vec_text_truncate(appended.clone(), 2), vec![String::new(), String::from("changed")]);
    assert!(core::vec_text_truncate(appended, 0).is_empty());
    assert!(core::vec_text_new().is_empty());
}

#[test]
fn bound_accepts_exact_capacity_and_long_valid_strings() {
    let maximum = vec![String::from("λ"); 4096];
    assert_eq!(core::vec_text_len(&maximum), 4096);
    assert_eq!(core::vec_text_from_slice(&maximum), maximum);
    assert_eq!(core::vec_text_append(maximum, Vec::new()).len(), 4096);
    assert_eq!(core::vec_text_push(vec![String::new(); 4095], String::from("last")).len(), 4096);
    let long = "λ".repeat(131072);
    assert_eq!(core::vec_text_get(&core::vec_text_from_slice(&[long.clone()]), 0), Some(long));
}

#[test]
#[should_panic(expected = "owned text vector resource bound")]
fn copying_an_oversized_native_slice_refuses() {
    core::vec_text_from_slice(&vec![String::new(); 4097]);
}

#[test]
#[should_panic(expected = "owned text vector resource bound")]
fn pushing_at_the_bound_refuses() {
    core::vec_text_push(vec![String::new(); 4096], String::new());
}

#[test]
#[should_panic(expected = "owned text vector resource bound")]
fn appending_beyond_the_bound_refuses() {
    core::vec_text_append(vec![String::new(); 4096], vec![String::new()]);
}

#[test]
#[should_panic(expected = "owned text vector replacement index")]
fn replacement_never_wraps_large_indices() {
    core::vec_text_replace(vec![String::from("x")], u64::MAX, String::from("y"));
}

#[test]
#[should_panic(expected = "owned text vector resource bound")]
fn lookup_does_not_skip_the_complete_input_bound() {
    core::vec_text_get(&vec![String::new(); 4097], u64::MAX);
}

#[test]
#[should_panic(expected = "owned text vector resource bound")]
fn truncation_does_not_silently_admit_an_oversized_input() {
    core::vec_text_truncate(vec![String::new(); 4097], 0);
}
