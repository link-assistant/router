//! Independent ordinary conditional callback oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::{translation_primitive_option_callbacks_core as option,translation_primitive_results_core as result,translation_owned_results_core as owned};
#[test]
fn branch_results_and_absent_or_error_inputs_preserve_standard_behavior() {
    for value in [None,Some(0_u64),Some(3),Some(5)] {
        assert_eq!(option::u64_to_u64_map(value,|item|if item>=3 {item+1}else{0}),value.map(|item|if item>=3 {item+1}else{0}));
        assert_eq!(option::u64_to_u64_and_then(value,|item|if item>=3 {Some(item)}else{None}),value.filter(|item|*item>=3));
        assert_eq!(option::u64_to_bool_map(value,|item|if item<2 {false}else if item<5 {true}else{false}),value.map(|item|(2..5).contains(&item)));
    }
    for value in [Ok(0_u64),Ok(3),Err("kept".to_owned())] {
        assert_eq!(result::u64_to_u64_map(value.clone(),|item|if item>=3 {item+1}else{0}),value.clone().map(|item|if item>=3 {item+1}else{0}));
        assert_eq!(result::u64_to_u64_and_then(value.clone(),|item|if item>=3 {Ok(item)}else{Err("small".to_owned())}),value.and_then(|item|if item>=3 {Ok(item)}else{Err("small".to_owned())}));
    }
    for value in [None,Some(String::new()),Some("Ω😀".to_owned())] {
        let original=value.clone();assert_eq!(option::text_owned_to_text_owned_map(value,|item|if item.is_empty(){"empty".to_owned()}else{item}),original.map(|item|if item.is_empty(){"empty".to_owned()}else{item}));
    }
    for value in [Ok(String::new()),Ok("Ω😀".to_owned()),Err(String::new()),Err("kept".to_owned())] {
        assert_eq!(owned::text_to_text_map(value.clone(),|item|if item.is_empty(){"empty".to_owned()}else{item}),value.clone().map(|item|if item.is_empty(){"empty".to_owned()}else{item}));
        assert_eq!(owned::text_map_err(value.clone(),|error|if error.is_empty(){"empty".to_owned()}else{error}),value.map_err(|error|if error.is_empty(){"empty".to_owned()}else{error}));
    }
}
