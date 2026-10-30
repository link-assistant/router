// Independent owned list oracle SOURCE. Gated CI only; never run locally.
use crate::translation_core::Json;

#[test]
fn owned_values_preserve_order_and_shared_elements_keep_their_list_owner() {
    let values = vec![Json::Null, Json::String("é😀".to_string())];
    assert_eq!(Json::Array(values.clone()), serde_json::json!([null, "é😀"]));
    let mut selected = Json::Null;
    for item in &values { selected = item.clone(); }
    assert_eq!(selected, serde_json::json!("é😀"));
    assert_eq!(values.len(), 2);
    let owned = Json::String("moved".to_string());
    let moved = vec![owned];
    assert_eq!(moved, vec![serde_json::json!("moved")]);
    let empty: Vec<Json> = vec![];
    assert!(empty.is_empty());
}
