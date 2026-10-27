//! Independent original logical/native callback oracle SOURCE. CI-only, UNRUN.
use link_assistant_router::translation_primitive_option_callbacks_core as callback;
#[test]
fn complete_boolean_callback_truth_tables_preserve_precedence() {
    for (item,flag,wanted) in [(false,false,true),(false,true,true),(true,false,true),(true,true,false)] {
        assert_eq!(callback::bool_to_bool_map(Some(item),|value|(!value&&flag)||!flag),Some(wanted));
    }
    for (item,threshold,wanted) in [(0_u64,9,true),(3,3,true),(3,4,false),(11,0,false)] {
        assert_eq!(callback::u64_to_bool_map(Some(item),|value|value>=threshold&&value<10||value==0),Some(wanted));
    }
    for (item,threshold,wanted) in [(3_u64,4,false),(3,5,true),(11,0,true)] {
        assert_eq!(callback::u64_to_bool_map(Some(item),|value|!((value+1>=threshold)&&(value<10))),Some(wanted));
    }
    for (item,wanted) in [("",true),("xé😀",true),("Ω😀",false)] {
        assert_eq!(callback::text_owned_to_bool_map(Some(item.to_owned()),|value|value.is_empty()||value.starts_with("x")),Some(wanted));
    }
}
#[test]
fn native_short_circuit_and_absent_callbacks_keep_the_actual_order() {
    for (item,wanted,visits) in [(false,false,0),(true,true,1)] {
        let mut seen=0;assert_eq!(callback::bool_to_bool_map(Some(item),|value|value&&{seen+=1;true}),Some(wanted));assert_eq!(seen,visits);
    }
    let mut seen=0;assert_eq!(callback::bool_to_bool_map(None,|value|value||{seen+=1;false}),None);assert_eq!(seen,0);
}
