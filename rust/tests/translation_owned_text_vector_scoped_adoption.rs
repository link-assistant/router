//! Independent scoped String-vector oracle cases; CI only after all JS gates.
#[path = "../src/translation_owned_text_vectors_core.rs"]
mod core;

fn original(flag: bool, input: &[String]) -> Vec<String> {
    let mut values = Vec::new();
    for value in input {
        if flag { values.push(value.clone()); } else { values.push(String::new()); }
    }
    values
}
fn adopted(flag: bool, input: &[String]) -> Vec<String> {
    let mut values = core::vec_text_new();
    for value in input {
        if flag {
            { let item = value.clone(); values = core::vec_text_push(values, item); }
        } else {
            { let item = String::new(); values = core::vec_text_push(values, item); }
        }
    }
    values
}
#[test]
fn branch_and_for_loop_cases_preserve_results_in_the_shared_bounded_domain() {
    for flag in [true, false] {
        for input in [vec![], vec![String::from("é"), String::from("🦀\0")]] {
            assert_eq!(adopted(flag, &input), original(flag, &input));
        }
    }
}
#[test]
fn unit_match_arm_blocks_evaluate_each_selected_operand_once() {
    for selected in [true, false] {
        let mut values = core::vec_text_new();
        let mut calls = 0;
        match selected {
            true => { let item = { calls += 1; String::from("yes") }; values = core::vec_text_push(values, item); },
            false => { let item = { calls += 1; String::from("no") }; values = core::vec_text_push(values, item); },
        }
        assert_eq!(calls, 1);
        assert_eq!(values, vec![String::from(if selected { "yes" } else { "no" })]);
    }
}
#[test]
fn while_loop_receiver_reads_precede_moves_and_continue_keeps_the_vector_live() {
    let mut values = core::vec_text_new();
    let mut at = 0;
    while at < 4 {
        at += 1;
        if at == 2 { continue; }
        { let item = core::vec_text_len(&values).to_string(); values = core::vec_text_push(values, item); }
    }
    assert_eq!(values, vec!["0", "1", "2"]);
}

#[test]
fn empty_predicates_and_clearing_preserve_contents_with_explicit_capacity_contract() {
    let mut original = vec![String::from("🦀\0")];
    let mut adopted = core::vec_text_from_slice(&[String::from("🦀\0")]);
    assert_eq!(original.is_empty(), core::vec_text_len(&adopted) == 0_u64);
    original.clear();
    adopted = core::vec_text_truncate(adopted, 0_u64);
    assert_eq!(original, adopted);
    assert!(core::vec_text_len(&adopted) == 0_u64);
}
