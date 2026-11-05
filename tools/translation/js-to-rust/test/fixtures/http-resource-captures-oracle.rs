// Independent Rust oracle SOURCE; CI only after all JavaScript gates.
use crate::translation_core::Json;

#[test]
fn immediate_predicates_read_their_enclosing_bindings_in_order() {
    let values = vec![serde_json::json!({"keep":"é😀"}), serde_json::json!({"other":null})];
    let key = "keep";
    let selected: Vec<Json> = values.iter().filter(|value| value.get(key).is_some()).cloned().collect();
    assert_eq!(selected, vec![values[0].clone()]);
    let allowed = true;
    let copied: Vec<Json> = values.iter().filter(|_| allowed).cloned().collect();
    assert_eq!(copied, values);
    let empty: Vec<Json> = Vec::new();
    assert!(!values.iter().any(|value| empty.iter().any(|_| value.get(key).is_some())));
    assert!(values.iter().any(|value| values.iter().any(|_| value.get(key).is_some())));
    let template = serde_json::json!({"template":null});
    let replaced: Vec<Json> = values.iter().map(|_| template.clone()).collect();
    assert_eq!(replaced, vec![template.clone(), template]);
}
