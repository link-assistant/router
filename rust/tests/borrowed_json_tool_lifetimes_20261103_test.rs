// Independent native oracle source. Execute only in CI after all JS gates.
pub use link_assistant_router::openai::ChatMessage;
pub use link_assistant_router::borrowed_json_tool_predicate_20261103;
use serde_json::{Value, json};

mod production {
    include!("../src/openai_tools.rs");

    pub(super) fn named<'input>(tool: &'input Value) -> bool {
        is_translatable(tool)
    }

    pub(super) fn second<'unused, 'input>(tool: &'input Value) -> bool {
        is_translatable(tool)
    }

    pub(super) fn static_input(tool: &'static Value) -> bool {
        is_translatable(tool)
    }
}

#[test]
fn named_input_has_no_returned_loan_and_preserves_original_value() {
    let answer;
    {
        let input = json!({"function": {"name": "λ😀"}});
        let before = input.clone();
        answer = production::named(&input);
        assert!(production::second(&input));
        assert_eq!(input, before);
    }
    assert!(answer);
}

#[test]
fn named_lifetimes_do_not_change_missing_null_or_web_observations() {
    let cases = [
        (json!({"name": "fallback"}), true),
        (json!({"name": "fallback", "function": null}), false),
        (json!({"function": {"name": ""}}), false),
        (json!({"type": "web_search", "function": null}), true),
        (json!({"type": "web_fetch", "name": null}), true),
        (json!({"type": "custom", "name": "x"}), false),
    ];
    for (input, expected) in cases {
        assert_eq!(production::named(&input), expected);
        assert_eq!(production::second(&input), expected);
        assert_eq!(
            borrowed_json_tool_predicate_20261103::borrowed_json_tool_is_translatable(&input),
            expected
        );
    }
}

#[test]
fn actual_static_reference_is_supported_without_promoting_local_inputs() {
    static EMPTY: Value = Value::Null;
    assert!(!production::static_input(&EMPTY));
    assert!(!production::named(&EMPTY));
}
