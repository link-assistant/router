//! Independent explicitly owning callback text target oracle SOURCE. CI-only UNRUN.
#[test]
fn typed_carrier_destinations_keep_allocations_values_and_lazy_error_observation(){
    for value in [None,Some(""),Some("é😀"),Some("a\0b")]{let original:Option<String>=value.map(|text|text.into());let adopted=value.map(link_assistant_router::translation_text_core::to_owned);assert_eq!(original,adopted);let original:Option<String>=value.map(|text|{text.into()});assert_eq!(original,adopted);}
    let value:Result<&str,String>=Ok("é😀");let original:Result<String,String>=value.map(|text|text.into());assert_eq!(original,Ok(String::from("é😀")));
    let mut called=0;let value:Result<u64,String>=Some(0_u64).ok_or_else(||{called+=1;"error".into()});assert_eq!(value,Ok(0));assert_eq!(called,0);let value:Result<u64,String>=None.ok_or_else(||{called+=1;"é😀".into()});assert_eq!(value,Err(String::from("é😀")));assert_eq!(called,1);
}
