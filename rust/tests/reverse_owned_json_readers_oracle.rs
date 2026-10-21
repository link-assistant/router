// Native CI-only library oracle. No local Rust tool execution is authorized.
// The JS witness is independently checked through real CST/owned source APIs.
// This oracle does not pretend to include an ungenerated reverse target.
use link_assistant_router::translation_core::Json;

#[allow(dead_code)]
const REVERSE_JSON_READER_JS_WITNESS: &str = r###"import {serde_json_value_get_string as getKey,serde_json_value_get_usize as getIndex,serde_json_value_pointer as pointer,serde_json_value_as_str as asText,serde_json_value_as_bool as asBool,serde_json_value_as_u64 as asU64,serde_json_value_as_i64 as asI64,serde_json_value_is_null as isNull} from './runtime/json-runtime.mjs';
export function read_key(value,key){return getKey(value,key);}
export function read_index(value,index){return getIndex(value,index);}
export function read_pointer(value,key){return pointer(value,key);}
export function read_text(value){return asText(value);}
export function read_bool(value){return asBool(value);}
export function read_u64(value){return asU64(value);}
export function read_i64(value){return asI64(value);}
export function read_null(value){return isNull(value);}
"###;

fn borrowed_text<'a>(value: &'a Json, key: &str) -> Option<&'a str> {
    match Json::get(value, key) {
        Some(found) => Json::as_str(found),
        None => None,
    }
}

#[test]
fn exact_reader_variants_numbers_and_loans() {
    let input = serde_json::json!({"a/b": {"~": "猫😀"}, "null": null, "yes": true,
        "max": u64::MAX, "min": i64::MIN, "arr": ["first", null]});
    assert_eq!(Json::get(&input, "missing"), None);
    assert_eq!(Json::get(&input, "null"), Some(&Json::Null));
    assert_eq!(Json::pointer(&input, "/a~1b/~").and_then(Json::as_str), Some("猫😀"));
    assert_eq!(Json::pointer(&input, ""), Some(&input));
    assert_eq!(Json::pointer(&input, "/arr/01"), None);
    let arr = Json::get(&input, "arr").unwrap();
    assert_eq!(Json::get(arr, 0usize).and_then(Json::as_str), Some("first"));
    assert_eq!(Json::get(arr, usize::MAX), None);
    assert_eq!(Json::as_bool(Json::get(&input, "yes").unwrap()), Some(true));
    assert_eq!(Json::as_u64(Json::get(&input, "max").unwrap()), Some(u64::MAX));
    assert_eq!(Json::as_i64(Json::get(&input, "max").unwrap()), None);
    assert_eq!(Json::as_i64(Json::get(&input, "min").unwrap()), Some(i64::MIN));
    assert_eq!(Json::as_u64(Json::get(&input, "min").unwrap()), None);
    assert!(Json::is_null(Json::get(&input, "null").unwrap()));
    assert!(!Json::is_null(&input));
    assert_eq!(borrowed_text(&input, "missing"), None);
    let text = serde_json::json!({"name": "retained"});
    let borrowed = borrowed_text(&text, "name").unwrap();
    assert_eq!(borrowed, "retained");
    assert_eq!(borrowed.as_ptr(), Json::get(&text, "name").unwrap().as_str().unwrap().as_ptr());
}
