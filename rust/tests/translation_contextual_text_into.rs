//! Independent explicit borrowed str Into<String> oracle SOURCE, CI-only UNRUN.
#[test]
fn explicit_owning_text_context_matches_the_existing_native_allocation_interface(){
    for value in ["","é😀","a\0b"," é😀 "]{let original:String=value.into();let adopted=link_assistant_router::translation_text_core::to_owned(value);assert_eq!(original,adopted);let original:String=value.trim().into();let adopted=link_assistant_router::translation_text_core::to_owned(link_assistant_router::translation_text_core::trim(value));assert_eq!(original,adopted);}
}
