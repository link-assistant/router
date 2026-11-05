//! Independent control-flow oracle SOURCE; only JavaScript-gated CI executes it.
use link_assistant_router::translation_core::Json;

fn until_null(values: &[Json]) -> Json {
    let mut result = Vec::new();
    for value in values {
        if value.is_null() {
            break;
        }
        result.push(value.clone());
    }
    Json::Array(result)
}

fn skipping_null(values: &[Json]) -> Json {
    let mut result = Vec::new();
    for value in values {
        if value.is_null() {
            continue;
        }
        result.push(value.clone());
    }
    Json::Array(result)
}

fn one_poll(enabled: bool) -> Json {
    let mut active = enabled;
    let mut result = Json::Null;
    while active {
        active = false;
        result = Json::Bool(true);
        continue;
    }
    result
}

fn carrier(enabled: bool) -> Result<Json, String> {
    let mut current = Ok(Json::Null);
    while current.is_ok() {
        if enabled {
            current = Err(String::from("changed"));
            continue;
        }
        break;
    }
    current
}

#[test]
fn empty_exclusive_and_iterated_control() {
    let a = Json::String(String::from("a"));
    let b = Json::String(String::from("b"));
    assert_eq!(until_null(&[a.clone(), Json::Null, b.clone()]), Json::Array(vec![a.clone()]));
    assert_eq!(until_null(&[]), Json::Array(Vec::new()));
    assert_eq!(skipping_null(&[Json::Null, a.clone(), Json::Null, b.clone()]), Json::Array(vec![a, b]));
    assert_eq!(one_poll(true), Json::Bool(true));
    assert_eq!(one_poll(false), Json::Null);
    assert_eq!(carrier(true), Err(String::from("changed")));
    assert_eq!(carrier(false), Ok(Json::Null));
}
