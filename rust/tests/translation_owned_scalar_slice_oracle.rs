//! Independent shared scalar slice oracle SOURCE. Only gated CI executes Rust.
use link_assistant_router::{translation_core as core,translation_state_core as state};
use serde_json::json;
fn copied(seed:&core::Json,value:&core::Json,values:&[u64],minimum:u64,limit:usize)->core::Json {
    let mut output=core::json_copy(seed);
    for item in values.iter().copied().filter(|item|*item>=minimum).take(limit) {
        output=state::json_append(output,core::json_copy(value));
    }
    output
}
#[test]
fn actual_copy_filter_take_uses_native_values_and_bounds() {
    let seed=json!([]);let value=json!("slice😀");
    assert_eq!(copied(&seed,&value,&[],0,9),seed);
    assert_eq!(copied(&seed,&value,&[0,1,2],1,9),json!(["slice😀","slice😀"]));
    assert_eq!(copied(&seed,&value,&[0,1,2],1,1),json!(["slice😀"]));
    assert_eq!(copied(&seed,&value,&[0,1,2],1,0),seed);
    assert_eq!(copied(&seed,&value,&[u64::MAX],u64::MAX,9),json!(["slice😀"]));
}
#[test]
fn actual_shared_integer_and_boolean_reads_keep_native_domains() {
    let signed=[i64::MIN,-1,0,i64::MAX];let mut count=0;
    for item in &signed { if *item<0 { count+=1; } }assert_eq!(count,2);
    assert_eq!([false,true,false,true].iter().copied().filter(|value|*value).count(),2);
    assert_eq!([0_u64,1,2].iter().map(|item|*item+1).collect::<Vec<_>>(),vec![1,2,3]);
}
