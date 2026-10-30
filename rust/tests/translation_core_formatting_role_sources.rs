//! Independent actual formatted callback/native oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_core,translation_primitive_option_callbacks_core as option,translation_primitive_results_core as result};
#[test]
fn lazy_formatted_errors_and_mapping_keep_actual_arguments_and_branch_counts() {
    for value in [None,Some(0_u64),Some(u64::MAX)] {
        let mut seen=0;let actual=option::u64_ok_or_else(value,||{seen+=1;translation_core::format!("missing {}",13_u64)});assert_eq!(actual,value.ok_or_else(||format!("missing {}",13_u64)));assert_eq!(seen,usize::from(value.is_none()));
        assert_eq!(option::u64_to_text_owned_map(value,|item|translation_core::format!("present {} {}",item,13_u64)),value.map(|item|format!("present {} {}",item,13_u64)));
    }
    for value in [Ok(0_u64),Err("Ω😀".to_owned())] {
        assert_eq!(result::u64_map_err(value.clone(),|error|translation_core::format!("{} {}",error,13_u64)),value.map_err(|error|format!("{} {}",error,13_u64)));
    }
}
