// Independent conditional/root oracle SOURCE. Gated CI only; never run locally.
fn borrowed<'a>(flag: bool, left: &'a str, right: &'a str) -> &'a str {
    if flag { left } else { right }
}

fn selected(flag: bool) -> u64 {
    if flag { 7 } else { panic!("selected failure") }
}

#[test]
fn selection_is_lazy_and_the_chosen_loan_keeps_its_original_owner() {
    let left = "é".to_string();
    let right = "😀".to_string();
    assert_eq!(borrowed(true, &left, &right), "é");
    assert_eq!(borrowed(false, &left, &right), "😀");
    assert_eq!(borrowed(true, &left, &right).repeat(2), "éé");
    assert_eq!(borrowed(false, &left, &right).repeat(2), "😀😀");
    assert_eq!(selected(true), 7);
    assert!(std::panic::catch_unwind(|| selected(false)).is_err());
}
