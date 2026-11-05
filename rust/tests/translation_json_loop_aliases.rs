// Independent original-versus-core loop oracle SOURCE. Gated CI only; UNRUN.
use link_assistant_router::{translation_collections_core as core, translation_state_core as state};
use serde_json::{json, Value};

fn original(values: &[Value], initial: Value) -> Value {
    let items = values;
    let borrowed = items;
    let mut result = initial;
    for value in borrowed { result = state::json_append(result, value.clone()); }
    result
}

#[test]
fn aliases_owned_borrowed_and_explicit_views_keep_order_and_empty_initial_value() {
    for values in [vec![], vec![Value::Null, json!(false), json!("é😀")]] {
        let initials = if values.is_empty() { vec![json!([]), json!("unchanged")] } else { vec![json!([])] };
        for initial in initials {
            let items = values.as_slice();
            let adopted = core::json_fold(items, initial.clone(), |result, value| state::json_append(result, value.clone()));
            assert_eq!(adopted, original(&values, initial.clone()));
            let owned = values.clone();
            let direct = core::json_fold(owned.as_slice(), initial.clone(), |result, value| state::json_append(result, value.clone()));
            assert_eq!(direct, original(&values, initial));
        }
    }
}

#[test]
fn initializer_runs_once_and_updates_follow_original_order() {
    for values in [vec![], vec![Value::Null, json!(false), json!("é😀")]] {
        let mut initialized = 0;
        let initial = { initialized += 1; Value::Null };
        let mut original = initial.clone();
        for value in values.iter() { original = link_assistant_router::translation_core::json_with_field(original, "last", value.clone()); }
        let mut observed = Vec::new();
        let adopted = core::json_fold(values.as_slice(), initial, |result, value| {
            observed.push(value.clone());
            link_assistant_router::translation_core::json_with_field(result, "last", value.clone())
        });
        assert_eq!(initialized, 1);
        assert_eq!(adopted, original);
        assert_eq!(observed, values);
    }
}
