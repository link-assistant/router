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

#[test]
fn exclusive_native_ranges_keep_the_last_increment_inside_the_numeric_domain() {
    for (lower,upper,expected) in [(u64::MAX-1,u64::MAX,1_usize),(2,2,0),(3,2,0)] {
        let mut count = 0_usize;
        for _ in lower..upper { count += 1; }
        assert_eq!(count,expected);
    }
    for (lower,upper,expected) in [(i64::MIN,i64::MIN+1,1_usize),(i64::MAX-1,i64::MAX,1),(1,-1,0),(-2,1,3)] {
        let mut count = 0_usize;
        for _ in lower..upper { count += 1; }
        assert_eq!(count,expected);
    }
}

#[test]
fn actual_take_distinguishes_zero_oversized_and_nested_limits_without_moving_shared_items() {
    let values = [json!(null),json!("é😀")];
    for (count,expected) in [(0,vec![]),(1,vec![json!(null)]),(usize::MAX,values.to_vec())] {
        let mut output = core::json_copy(&json!([]));
        for value in values.iter().take(count) { output = state::json_append(output,core::json_copy(value)); }
        assert_eq!(output,json!(expected));
    }
    let mut output = core::json_copy(&json!([]));
    for value in values.iter().take(2).take(1) { output = state::json_append(output,core::json_copy(value)); }
    assert_eq!(output,json!([null]));
}

#[test]
fn original_reversed_ranges_preserve_inclusive_extrema_and_source_item_order() {
    let values = [json!("low"),json!("middle"),json!("high")];
    let mut output = core::json_copy(&json!([]));
    for index in (0_u64..3_u64).rev() {
        output = state::json_append(output,core::json_copy(&values[usize::try_from(index).unwrap()]));
    }
    assert_eq!(output,json!(["high","middle","low"]));
    assert_eq!((i64::MIN..=i64::MIN+1).rev().collect::<Vec<_>>(),vec![i64::MIN+1,i64::MIN]);
    assert_eq!((u64::MAX-1..=u64::MAX).rev().collect::<Vec<_>>(),vec![u64::MAX,u64::MAX-1]);
    assert_eq!((0_u64..=0_u64).rev().collect::<Vec<_>>(),vec![0_u64]);
    assert_eq!((i64::MIN..=i64::MIN).rev().collect::<Vec<_>>(),vec![i64::MIN]);
}

// Independent fixed-width range expectations; Rust executes only in gated CI.
macro_rules! fixed_width_counted_range_oracle {
    ($case:ident, $width:ty) => {
        #[test]
        fn $case() {
            fn ascending(lower: $width, upper: $width) -> core::Json {
                let mut result = json!([]);
                for index in lower..upper {
                    if index == lower { continue; }
                    result = state::json_append(result, json!(null));
                    break;
                }
                result
            }
            fn descending(lower: $width, upper: $width) -> core::Json {
                let mut result = json!([]);
                for index in (lower..=upper).rev() {
                    if index == upper { continue; }
                    result = state::json_append(result, json!(null));
                    break;
                }
                result
            }
            fn early(lower: $width, upper: $width) -> core::Json {
                for index in lower..upper { if index == lower { return json!(null); } }
                json!([])
            }
            let low = <$width>::MIN;
            let high = <$width>::MAX;
            assert_eq!(ascending(low, low), json!([]));
            assert_eq!(ascending(high, low), json!([]));
            assert_eq!(ascending(low, low + 1), json!([]));
            assert_eq!(ascending(low, low + 2), json!([null]));
            assert_eq!(ascending(high - 2, high), json!([null]));
            assert_eq!(descending(low, low), json!([]));
            assert_eq!(descending(high, low), json!([]));
            assert_eq!(descending(low, low + 1), json!([null]));
            assert_eq!(descending(high - 1, high), json!([null]));
            assert_eq!(early(low, low), json!([]));
            assert_eq!(early(low, low + 1), json!(null));
        }
    };
}
fixed_width_counted_range_oracle!(counted_ranges_u8, u8);
fixed_width_counted_range_oracle!(counted_ranges_i8, i8);
fixed_width_counted_range_oracle!(counted_ranges_u16, u16);
fixed_width_counted_range_oracle!(counted_ranges_i16, i16);
fixed_width_counted_range_oracle!(counted_ranges_u32, u32);
fixed_width_counted_range_oracle!(counted_ranges_i32, i32);
fixed_width_counted_range_oracle!(counted_ranges_u64, u64);
fixed_width_counted_range_oracle!(counted_ranges_i64, i64);
fixed_width_counted_range_oracle!(counted_ranges_u128, u128);
fixed_width_counted_range_oracle!(counted_ranges_i128, i128);
