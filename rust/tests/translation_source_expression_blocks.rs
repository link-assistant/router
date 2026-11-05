//! Independent actual source expression block oracle SOURCE, CI-only UNRUN.
use link_assistant_router::{translation_core::format,translation_integer_core as integer};
#[test]
fn source_expression_blocks_keep_capture_reads_local_mutation_and_child_returns(){
    for value in [0_u64,1,u64::MAX]{let result=(||->String{let selected=value;format!("{}",selected)})();assert_eq!(result,value.to_string());let local=(||->String{let mut current=integer::u64_saturating_add(value,1);current=integer::u64_saturating_add(current,2);format!("{}",current)})();assert_eq!(local,value.saturating_add(1).saturating_add(2).to_string());}
    let input="é😀";let result=(||->String{let selected=input;format!("{}",selected)})();assert_eq!(result,input);let narrow=(||->i8{-1})();assert_eq!(narrow,-1);
}
