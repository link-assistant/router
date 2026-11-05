//! Independent lazy callback oracle SOURCE. Only gated CI may execute Rust.
use link_assistant_router::{translation_core as core,translation_state_core as state};
use serde_json::json;

fn adapted(seed:&core::Json,value:&core::Json,count:u64,limit:usize)->core::Json {
    let mut output=core::json_copy(seed);
    for index in (0_u64..count).filter(|index|*index>=1).map(|index|index+1).take(limit) {
        if index==3 { continue; }
        output=state::json_append(output,core::json_copy(value));
    }
    output
}
#[test]
fn lazy_adapters_keep_order_and_stop_before_unconsumed_overflow() {
    let seed=json!([]);let value=json!("é😀");
    for (count,limit,expected) in [(0,9,0),(1,9,0),(2,9,1),(3,9,1),(4,9,2),(5,0,0),(5,1,1),(5,2,1)] {
        assert_eq!(adapted(&seed,&value,count,limit),json!(vec![value.clone();expected]));
    }
    let mut evaluated=0;
    for _ in (u64::MAX-1..u64::MAX).map(|index|{evaluated+=1;index+2}).take(0) { panic!("unreachable"); }
    assert_eq!(evaluated,0);
    assert!(std::panic::catch_unwind(||{let _=(u64::MAX-1..u64::MAX).map(|index|index.checked_add(2).unwrap()).take(1).next();}).is_err());
}
#[test]
fn scalar_projection_does_not_move_borrowed_receiver_storage() {
    let values=vec![json!(null),json!({}),json!({"enabled":false}),json!({"enabled":true})];
    let copied=state::json_values_copy(&values);
    let mut present=0;
    for found in copied.iter().map(|item|state::json_object_has(item,"enabled")) { if found { present+=1; } }
    assert_eq!(present,2);
    assert_eq!(state::json_from_values(copied),json!([null,{}, {"enabled":false},{"enabled":true}]));
}
#[test]
fn return_stays_in_its_actual_iterator_callback() {
    let observed:Vec<_>=(0_u64..3).map(|value|{if value==1{return 2;}value}).collect();
    assert_eq!(observed,vec![0,2,2]);
}
