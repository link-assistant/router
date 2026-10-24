//! Independent native loop boundary oracle source. Only gated CI executes Rust.
use link_assistant_router::{translation_core as core, translation_state_core as state};
use serde_json::json;

fn while_appended(seed: &core::Json, value: &core::Json, count: u64) -> core::Json {
    let mut output = core::json_copy(seed);
    let mut index = 0_u64;
    while index < count {
        index += 1;
        if index == 2 { continue; }
        output = state::json_append(output,core::json_copy(value));
        if index >= 4 { break; }
    }
    output
}
fn range_appended(seed: &core::Json, value: &core::Json, count: u64) -> core::Json {
    let mut output = core::json_copy(seed);
    for index in 0_u64..count {
        if index == 1 { continue; }
        output = state::json_append(output,core::json_copy(value));
        if index >= 3 { break; }
    }
    output
}
fn from_slice(seed: &core::Json, values: &[core::Json]) -> core::Json {
    let mut output = core::json_copy(seed);
    for value in values { output = state::json_append(output,core::json_copy(value)); }
    output
}
#[test]
fn actual_while_and_range_boundaries_distinguish_continue_from_break() {
    let seed = json!([]); let value = json!("é😀");
    for (count,expected) in [(0,0),(1,1),(2,1),(3,2),(4,3),(5,3)] {
        let wanted = json!(vec![value.clone();expected]);
        assert_eq!(while_appended(&seed,&value,count),wanted);
        assert_eq!(range_appended(&seed,&value,count),wanted);
    }
}
#[test]
fn shared_items_are_copied_and_owned_iterator_storage_moves_only_after_the_borrow_ends() {
    let values = vec![json!(null),json!("😀")];
    assert_eq!(from_slice(&json!([]),&values),json!([null,"😀"]));
    let copied = state::json_values_copy(&values);
    for value in &copied { assert_eq!(core::json_copy(value),*value); }
    assert_eq!(state::json_from_values(copied),json!([null,"😀"]));
}
