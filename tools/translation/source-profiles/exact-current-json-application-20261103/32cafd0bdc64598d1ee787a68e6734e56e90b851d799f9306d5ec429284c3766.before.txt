// Source oracle compares the actual entire application module, not a copied predicate.
pub use link_assistant_router::openai::ChatMessage;
mod production {
    include!("../src/openai_tools.rs");
    pub(super) fn actual(value:&serde_json::Value)->bool { is_translatable(value) }
}
#[path="../src/borrowed_json_tool_predicate_20261103.rs"]
mod kernel;
use serde_json::{Value,json};
#[test]
fn unrestricted_projection_and_fallback() {
    let cases:Vec<(Value,bool)>=vec![
        (Value::Null,false),(json!([]),false),(json!(true),false),
        (json!({"name":"top"}),true),(json!({"type":null,"name":"top"}),true),
        (json!({"type":false,"name":"top"}),true),
        (json!({"name":"top","function":null}),false),
        (json!({"function":{"name":"nested"}}),true),
        (json!({"function":{"name":""}}),false),
        (json!({"name":" "}),true),(json!({"name":"😀"}),true),
        (json!({"type":"web_search","function":null}),true),
        (json!({"type":"web_fetch"}),true),(json!({"type":"custom"}),false),
        (json!({"name":"x".repeat(1_048_577)}),true),
        (json!({"name":"yes","unused":vec![Value::Null;65_537]}),true),
    ];
    for (value,expected) in cases {
        assert_eq!(production::actual(&value),expected);
        assert_eq!(kernel::borrowed_json_tool_is_translatable(&value),expected);
    }
}
