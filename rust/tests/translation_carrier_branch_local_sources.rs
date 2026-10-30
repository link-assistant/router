//! Independent immutable branch-local/native oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as option,translation_primitive_results_core as result};
#[test]
fn local_branch_values_keep_standard_results_and_nonselected_paths() {
    for value in [None,Some(0_u64),Some(3),Some(5)] {
        assert_eq!(option::u64_to_u64_map(value,|item|if item>=3 {let increased=item+1;increased}else{let fallback=0;fallback}),value.map(|item|if item>=3 {item+1}else{0}));
        assert_eq!(option::u64_to_u64_and_then(value,|item|if item>=3 {let next=item+1;Some(next)}else{let absent:Option<u64>=None;absent}),value.filter(|item|*item>=3).map(|item|item+1));
    }
    for value in [Ok(0_u64),Ok(3),Err("kept".to_owned())] {
        assert_eq!(result::u64_to_u64_and_then(value.clone(),|item|if item>=3 {let next=item+1;Ok(next)}else{let small="small".to_owned();Err(small)}),value.and_then(|item|if item>=3 {Ok(item+1)}else{Err("small".to_owned())}));
    }
    let original="Ω😀".to_owned();let pointer=original.as_ptr();let value=option::text_owned_to_text_owned_map(Some(original),|item|if item.is_empty(){let empty="empty".to_owned();empty}else{let kept=item;kept}).expect("original Some");assert_eq!(value,"Ω😀");assert_eq!(value.as_ptr(),pointer);
}
