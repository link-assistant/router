//! Independent three-catalogue callback composition oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as option,translation_primitive_option_core as primitive,translation_primitive_results_core as result,translation_owned_results_core as owned,translation_integer_core as integer};
#[test]
fn original_callback_results_chain_and_project_without_changing_absence_or_errors() {
    fn try_option(value:Option<u64>)->Option<u64>{let selected=option::u64_to_u64_map(value,|item|item+1)?;Some(integer::u64_saturating_add(selected,2))}
    fn try_result(value:Result<u64,String>)->Result<u64,String>{let selected=result::u64_to_u64_map(value,|item|item+1)?;Ok(integer::u64_saturating_add(selected,2))}
    for value in [None,Some(0_u64),Some(3),Some(u64::MAX-1)] {assert_eq!(try_option(value),value.map(|item|(item+1).saturating_add(2)));assert_eq!(option::u64_to_u64_and_then(value,|item|option::u64_to_u64_map(primitive::u64_some(item),|next|next+1)),value.map(|item|item+1));}
    for value in [Ok(0_u64),Ok(3),Ok(u64::MAX-1),Err("Ω😀".to_owned())] {assert_eq!(try_result(value.clone()),value.clone().map(|item|(item+1).saturating_add(2)));let composed=result::u64_to_u64_and_then(value.clone(),|item|result::u64_to_u64_map(result::u64_ok(item),|next|next+1));assert_eq!(composed,value.map(|item|item+1));}
    for value in [Ok(" Ω😀 ".to_owned()),Ok(String::new()),Err("denied".to_owned())] {let expected=value.clone();let mapped=owned::text_to_text_map(value,|message|message);assert_eq!(owned::text_to_text_map(mapped,|message|message),expected);}
}
#[test]
fn nested_option_error_and_result_mapping_preserve_lazy_callback_order() {
    use std::cell::RefCell;
    for value in [None,Some(3_u64)] {let calls=RefCell::new(Vec::new());let converted=option::u64_ok_or_else(value,||{calls.borrow_mut().push("error");"missing".to_owned()});let actual=result::u64_to_u64_map(converted,|item|{calls.borrow_mut().push("success");item+1});assert_eq!(actual,value.ok_or_else(||"missing".to_owned()).map(|item|item+1));assert_eq!(*calls.borrow(),if value.is_some(){vec!["success"]}else{vec!["error"]});}
}
