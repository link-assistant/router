//! Independent native String builder/value reinitialization oracle SOURCE. CI-only UNRUN.
#[test]
fn original_string_builder_and_qualified_text_results_keep_values_and_order(){
    for value in ["","é😀","a\0b"]{let mut original=String::new();original.push_str("prefix:");original.push_str(value);let mut adopted=String::new();adopted=link_assistant_router::translation_core::format!("{}{}",&adopted,"prefix:");adopted=link_assistant_router::translation_core::format!("{}{}",&adopted,value);assert_eq!(original,adopted);original.clear();adopted=link_assistant_router::translation_text_core::to_owned("");assert_eq!(original,adopted);for _ in 0..3{original.push_str(value);adopted=link_assistant_router::translation_core::format!("{}{}",&adopted,value);}assert_eq!(original,adopted);}
}
