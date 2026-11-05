//! Independent native stable/computed primitive formatting SOURCE. CI-only UNRUN.
use std::cell::RefCell;
#[test]
fn primitive_arguments_and_computed_arguments_keep_values_and_evaluation_order(){
    let events=RefCell::new(Vec::new());let observe=|value:u64|{events.borrow_mut().push(value);value};let shown=link_assistant_router::translation_core::format!("{}:{}",observe(1),observe(2));assert_eq!(shown,"1:2");assert_eq!(events.borrow().as_slice(),&[1,2]);
    let text="é😀";let value=u64::MAX;assert_eq!(link_assistant_router::translation_core::format!("{}:{}",text,value),"é😀:18446744073709551615");assert_eq!(link_assistant_router::translation_core::format!("{}",false),"false");assert_eq!(link_assistant_router::translation_core::format!("{}",i128::MIN),"-170141183460469231731687303715884105728");assert_eq!(link_assistant_router::translation_core::format!("{}{}",text,"{tail}"),"é😀{tail}");
}
