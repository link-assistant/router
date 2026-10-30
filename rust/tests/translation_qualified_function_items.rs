//! Independent exact qualified function-item substitution oracle SOURCE, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as callback,translation_primitive_option_core as optional,translation_primitive_results_core as result,translation_owned_results_core as owned};
fn duplicate(value:&str)->String{value.to_owned()}
fn identity(value:&str)->&str{value}
fn empty(value:&str)->bool{value.is_empty()}
fn some(value:u64)->Option<u64>{Some(value)}
fn zero()->u64{0}
fn none()->Option<String>{None}
fn absolute(value:i64)->i64{value.saturating_abs()}
fn okay(value:u64)->Result<u64,String>{Ok(value)}
fn text(value:String)->String{value}
fn text_ok(value:String)->Result<String,String>{Ok(value)}
#[test]
fn qualified_function_items_and_same_path_closures_preserve_values_laziness_and_borrows(){
    for value in [None,Some(""),Some("é😀")] {assert_eq!(value.map(duplicate),callback::str_to_text_owned_map(value,|argument|duplicate(argument)));assert_eq!(value.map(empty),callback::str_to_bool_map(value,|argument|empty(argument)));assert_eq!(value.is_some_and(empty),optional::bool_unwrap_or(callback::str_to_bool_map(value,|argument|empty(argument)),false));}
    let root=String::from("é😀");let result=callback::str_to_str_map(Some(root.as_str()),|argument|identity(argument)).unwrap();assert_eq!(result.as_ptr(),root.as_ptr());
    for value in [None,Some(0_u64),Some(u64::MAX)] {assert_eq!(value.and_then(some),callback::u64_to_u64_and_then(value,|argument|some(argument)));assert_eq!(value.unwrap_or_else(zero),callback::u64_unwrap_or_else(value,||zero()));}
    for value in [None,Some("é😀".to_owned())] {assert_eq!(value.clone().or_else(none),callback::text_owned_or_else(value,||none()));}
}
#[test]
fn qualified_result_function_items_preserve_error_paths_and_owned_transfers(){
    for value in [Ok(i64::MIN),Ok(0),Err("Ω😀".to_owned())] {assert_eq!(value.clone().map(absolute),result::i64_to_i64_map(value,|argument|absolute(argument)));}
    for value in [Ok(0_u64),Ok(u64::MAX),Err("Ω😀".to_owned())] {assert_eq!(value.clone().and_then(okay),result::u64_to_u64_and_then(value,|argument|okay(argument)));}
    for value in [Ok("é😀".to_owned()),Err("Ω😀".to_owned())] {assert_eq!(value.clone().map(text),owned::text_to_text_map(value.clone(),|argument|text(argument)));assert_eq!(value.clone().or_else(text_ok),owned::text_or_else(value,|argument|text_ok(argument)));}
}
