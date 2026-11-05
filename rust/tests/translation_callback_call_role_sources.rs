//! Independent actual callback return/local/Try oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as option,translation_primitive_results_core as result,translation_integer_core as integer};
#[test]
fn declared_callback_results_feed_actual_result_option_and_try_operations() {
    for value in [None,Some(0_u64),Some(3)] {
        let pending=option::u64_ok_or_else(value,||"missing".to_owned());assert_eq!(result::u64_to_u64_map(pending,|item|item+1),value.ok_or_else(||"missing".to_owned()).map(|item|item+1));
    }
    for value in [None,Some(false),Some(true)] {
        let pending=option::bool_to_u64_map(value,u64::from);assert_eq!(option::u64_to_u64_map(pending,|item|item+1),value.map(|item|u64::from(item)+1));
    }
    fn projected(value:Option<u64>)->Result<u64,String>{let selected=option::u64_ok_or_else(value,||"missing".to_owned())?;Ok(integer::u64_saturating_add(selected,2))}
    for value in [None,Some(0_u64),Some(u64::MAX)] {assert_eq!(projected(value),value.ok_or_else(||"missing".to_owned()).map(|item|item.saturating_add(2)));}
}
