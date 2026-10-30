// Independent Rust oracle SOURCE; CI only after every JavaScript gate passes.
use crate::translation_core::Json;

fn descend(input: Json, again: bool) -> Json {
    if again { descend(input, false) } else { input }
}

#[test]
fn owning_inputs_preserve_complete_payloads_and_recursive_moves() {
    let value = serde_json::json!({"old":"é😀"});
    assert_eq!(descend(value.clone(), true), value);
    assert_eq!(descend(value.clone(), false), value);
    let list = vec![Json::Null, serde_json::json!("é😀")];
    assert_eq!(Json::Array(list.clone()), serde_json::json!([null,"é😀"]));
    let selected: Result<Json, String> = Some(value.clone()).ok_or_else(|| "missing".into());
    assert_eq!(selected, Ok(value));
    let absent: Option<Json> = None;
    assert_eq!(absent.ok_or_else(|| "missing".to_string()), Err("missing".to_string()));
    let input = "é😀".to_string();
    let identity = |owned: String| owned;
    assert_eq!(identity(input), "é😀");
}
