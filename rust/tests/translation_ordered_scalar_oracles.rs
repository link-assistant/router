//! Original ordered scalar match semantics. Source drafted; CI execution only.

fn text_match(value: &str) -> u64 {
    match value {
        "ab" => 1,
        "cd" => 2,
        _ => 3,
    }
}

#[test]
fn ordered_text_alternatives_preserve_exact_scalar_selection() {
    assert_eq!(text_match("ab"), 1);
    assert_eq!(text_match("cd"), 2);
    assert_eq!(text_match(""), 3);
    assert_eq!(text_match("abc"), 3);
    assert_eq!(text_match("Ω😀"), 3);
}

#[test]
fn local_match_keeps_the_chosen_value_and_final_fallback() {
    for value in ["ab", "cd", "", "Ω😀"] {
        let selected = match value {
            "ab" => 1_u128,
            "cd" => 2_u128,
            _ => 3_u128,
        };
        assert_eq!(selected, u128::from(text_match(value)));
    }
}

#[test]
fn boolean_match_keeps_extreme_scalar_values() {
    for value in [i128::MIN, 0, i128::MAX] {
        let selected = match true {
            true => value,
            _ => 0,
        };
        assert_eq!(selected, value);
        let absent = match false {
            true => value,
            _ => 0,
        };
        assert_eq!(absent, 0);
    }
}
