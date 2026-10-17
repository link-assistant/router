//! Independent borrowed-text adoption behavior. UNRUN locally for issue #759.
//! Rust execution remains gated on every JavaScript CI stage at the same SHA.
use link_assistant_router::translation_core::{self, Maybe, Str, Text};

fn canonical_provider(provider: &Str) -> Text {
    translation_core::format!(
        "{}",
        match provider {
            "claude" => "anthropic",
            "chatgpt" | "openai-codex" => "codex",
            "google" => "gemini",
            "qwen-code" => "qwen",
            other => other,
        }
    )
}

#[test]
fn complete_provider_match_preserves_order_and_borrowed_fallback() {
    for (input, expected) in [
        ("claude", "anthropic"),
        ("chatgpt", "codex"),
        ("openai-codex", "codex"),
        ("google", "gemini"),
        ("qwen-code", "qwen"),
        ("custom", "custom"),
        ("", ""),
        ("猫😀\0", "猫😀\0"),
    ] {
        assert_eq!(canonical_provider(input), expected);
    }
}

#[test]
fn explicit_shared_text_and_immutable_aliases_preserve_code_units() {
    for value in ["", "ASCII", "Ω猫😀", "\0\r\n"] {
        let alias = value;
        let final_alias = alias;
        let actual = translation_core::format!("{}", final_alias);
        assert_eq!(actual, value);
    }
}

#[test]
fn owned_copy_mutation_does_not_change_borrowed_input() {
    let input = Text::from("猫😀");
    let borrowed: &Str = &input;
    let mut actual = translation_core::format!("{}", borrowed);
    actual.push('!');
    assert_eq!(actual, "猫😀!");
    assert_eq!(input, "猫😀");
}

#[test]
fn optional_shared_text_maps_some_and_none_to_owned_text() {
    for input in [None, Some(""), Some("猫😀"), Some("\0")] {
        let actual: Maybe<Text> = input.map(|value| translation_core::format!("{}", value));
        assert_eq!(actual, input.map(str::to_string));
        assert_eq!(actual, input.map(str::to_owned));
    }
}

#[test]
fn optional_receiver_is_evaluated_once_and_none_skips_callback() {
    use std::cell::Cell;
    let receiver_calls = Cell::new(0);
    let callback_calls = Cell::new(0);
    let receiver = || {
        receiver_calls.set(receiver_calls.get() + 1);
        Some("borrowed")
    };
    let actual = receiver().map(|value| {
        callback_calls.set(callback_calls.get() + 1);
        translation_core::format!("{}", value)
    });
    assert_eq!(actual.as_deref(), Some("borrowed"));
    assert_eq!(receiver_calls.get(), 1);
    assert_eq!(callback_calls.get(), 1);
    let none: Maybe<&Str> = None;
    let actual = none.map(|value| {
        callback_calls.set(callback_calls.get() + 1);
        translation_core::format!("{}", value)
    });
    assert_eq!(actual, None);
    assert_eq!(callback_calls.get(), 1);
}

#[test]
fn initializer_reads_the_previous_binding_before_shadowing() {
    let value: &Str = "outer";
    let value = translation_core::format!("{}", value);
    assert_eq!(value, "outer");
}

#[test]
fn branch_local_same_names_do_not_change_the_outer_borrow() {
    let selected: &Str = "outer";
    {
        let selected = true;
        assert!(selected);
    }
    assert_eq!(translation_core::format!("{}", selected), "outer");
}

#[test]
fn literal_alternatives_and_unicode_fallback_keep_exact_text() {
    for (input, expected) in [("a", "first"), ("b", "first"), ("猫", "cat"), ("猫😀", "猫😀")] {
        let actual = translation_core::format!(
            "{}",
            match input {
                "a" | "b" => "first",
                "猫" => "cat",
                other => other,
            }
        );
        assert_eq!(actual, expected);
    }
}
