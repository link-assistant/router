// Independent native oracle SOURCE; no local Rust execution is authorized.
use link_assistant_router::translation_core::{self as core, Json};
use link_assistant_router::translation_state_core as state;

fn copied(values: &[Json]) -> Vec<Json> {
    state::json_values_copy(values)
}

fn shared(values: &[Json]) -> &[Json] {
    values
}

fn local_view(values: &[Json]) -> Vec<Json> {
    let owned = copied(values);
    let view = shared(&owned);
    copied(view)
}

fn refreshed(values: &[Json]) -> Vec<Json> {
    let mut owned = copied(values);
    let mut pending = true;
    while pending {
        owned = copied(&owned);
        pending = false;
    }
    owned
}

#[test]
fn owned_json_lists_and_shared_slices_preserve_values_and_identity() {
    let values = vec![core::json!(null), core::json!("é😀")];
    assert_eq!(copied(&values), values);
    assert_eq!(local_view(&values), values);
    assert_eq!(refreshed(&values), values);
    assert!(std::ptr::eq(shared(&values).as_ptr(), values.as_ptr()));
    assert_eq!(
        state::json_from_values(copied(&values)),
        core::json!([null, "é😀"])
    );
    assert_eq!(state::json_into_values(core::json!([null, "é😀"])), values);
    assert_eq!(
        state::json_extend(core::json!([]), &values),
        core::json!([null, "é😀"])
    );
    assert_eq!(
        state::json_extend_owned(core::json!([]), copied(&values)),
        core::json!([null, "é😀"])
    );
    assert_eq!(values, vec![core::json!(null), core::json!("é😀")]);
}
