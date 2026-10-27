//! Independent typed text concatenation oracle SOURCE, CI-only UNRUN.
use std::cell::RefCell;
#[test]
fn canonical_text_concatenation_keeps_values_operand_order_and_original_owners(){
    let events=RefCell::new(Vec::new());let left=||{events.borrow_mut().push("left");String::from("é")};let right=||{events.borrow_mut().push("right");String::from("😀")};let result=link_assistant_router::translation_core::format!("{}{}",left(),right());assert_eq!(result,"é😀");assert_eq!(events.borrow().as_slice(),&["left","right"]);
    let owned=String::from("é😀");let result=link_assistant_router::translation_core::format!("{}{}",owned,"tail");assert_eq!(result,"é😀tail");assert_eq!(owned,"é😀");assert_eq!(link_assistant_router::translation_core::format!("{}{}",u64::MAX,false),"18446744073709551615false");assert_eq!(link_assistant_router::translation_core::format!("{}{}",i8::MIN,"é😀"),"-128é😀");
}
