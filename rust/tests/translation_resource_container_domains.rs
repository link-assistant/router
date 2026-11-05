//! Independent all-width carrier identity oracle SOURCE, CI-only UNRUN.
#[test]
fn option_result_and_nested_numeric_carriers_preserve_every_native_width(){
    macro_rules! cases{($($kind:ty),*)=>{$(for value in [<$kind>::MIN,0 as $kind,<$kind>::MAX]{let optional=Some(value);assert_eq!(link_assistant_router::translation_primitive_option_core::option_identity(optional),optional);let outcome:Result<$kind,String>=Ok(value);assert_eq!(link_assistant_router::translation_owned_results_core::text_result_identity(outcome.clone()),outcome);let nested=Some(outcome);assert_eq!(link_assistant_router::translation_primitive_option_core::option_identity(nested.clone()),nested);}let absent:Option<$kind>=None;assert_eq!(link_assistant_router::translation_primitive_option_core::option_identity(absent),None);let error:Result<$kind,String>=Err("Ω😀".to_owned());assert_eq!(link_assistant_router::translation_owned_results_core::text_result_identity(error.clone()),error);)*};}
    cases!(u8,u16,u32,u64,u128,i8,i16,i32,i64,i128);
}
