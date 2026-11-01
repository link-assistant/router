//! Independent expected values for owned peer reconciliation. SOURCE ONLY / UNRUN.
//! Integrate as a module of an existing oracle target; no new Cargo target here.
use link_assistant_router::translation_carriers_core as carrier;
use link_assistant_router::translation_core::Json;

fn combined(left: u8, right: u8) -> u8 {
    left ^ right
}

fn original_combined(left: u8, right: u8) -> u8 {
    left | right
}

fn second_combined(left: u8, right: u8) -> u8 {
    left & right
}

fn changed(value: &Result<Json, String>) -> Result<Json, String> {
    match value {
        Err(_) => carrier::json_err("paired"),
        Ok(_) => carrier::json_result_copy(value),
    }
}

fn recovered(value: &Result<Json, String>, fallback: &Json) -> Json {
    let option = carrier::json_result_to_option(value);
    carrier::json_option_or(&option, fallback)
}

#[test]
fn scalar_edits_and_original_error_payloads() {
    assert_eq!(combined(85, 51), 102);
    assert_eq!(combined(255, 0), 255);
    assert_eq!(combined(255, 255), 0);
    assert_eq!(original_combined(85, 51), 119);
    assert_eq!(second_combined(85, 51), 17);
    assert_eq!(changed(&Err("input".to_owned())), Err("paired".to_owned()));
    assert_eq!(changed(&Ok(serde_json::json!(true))), Ok(serde_json::json!(true)));
}

#[test]
fn result_option_json_composition_clones_the_owned_value_or_fallback() {
    let value = Ok(serde_json::json!({"snow":"雪😀","values":[true, 7]}));
    let fallback = serde_json::json!({"fallback":true});
    assert_eq!(recovered(&value, &fallback), serde_json::json!({"snow":"雪😀","values":[true, 7]}));
    assert_eq!(recovered(&Err("input".to_owned()), &fallback), fallback);
    assert_eq!(value, Ok(serde_json::json!({"snow":"雪😀","values":[true, 7]})));
}
