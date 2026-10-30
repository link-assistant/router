//! Independent explicit owning branch target oracle SOURCE. CI-only UNRUN.
#[test]
fn complete_branch_and_typed_initializer_contexts_keep_text_values(){
    for value in ["","é😀","a\0b"]{for flag in [false,true]{let original:String=if flag{value.into()}else{"é😀".into()};let adopted=if flag{link_assistant_router::translation_text_core::to_owned(value)}else{link_assistant_router::translation_text_core::to_owned("é😀")};assert_eq!(original,adopted);let original:String=if flag{{value.into()}}else{{"é😀".into()}};assert_eq!(original,adopted);}}
}
