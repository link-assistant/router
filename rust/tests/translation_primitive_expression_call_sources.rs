//! Independent numeric expression/source composition oracle. CI-only, UNRUN.
use link_assistant_router::{translation_text_core as text,translation_integer_core as integer,translation_primitive_option_callbacks_core as callback,translation_primitive_results_core as result};
#[test]
fn complete_numeric_expression_callers_preserve_native_order_width_and_branch() {
    for (value,delta) in [("",0_u64),("é😀",3),("count",12)] {
        let direct=(text::len_utf8(value)+delta).saturating_add(2);
        assert_eq!(integer::u64_saturating_add(text::len_utf8(value)+delta,2),direct);
        let mut seen=0;let actual=callback::u64_to_bool_map(Some(delta),|item|{seen+=1;item+1>=4});
        assert_eq!(actual,Some(delta).map(|item|item+1>=4));assert_eq!(seen,1);
    }
    for value in [None,Some(0_u64),Some(3),Some(100)] {
        assert_eq!(callback::u64_to_u64_map(value,|item|item+2),value.map(|item|item+2));
        assert_eq!(callback::u64_to_u64_and_then(value,|item|Some(item+2)),value.and_then(|item|Some(item+2)));
        assert_eq!(callback::u64_to_bool_map(value,|item|{let next=item+2;next>=5}),value.map(|item|item+2>=5));
    }
    let mut seen=0;assert_eq!(callback::u64_to_u64_map(None,|item|{seen+=1;item+2}),None);assert_eq!(seen,0);
    for value in [Ok(0_u64),Ok(3),Err("kept".to_owned())] {
        assert_eq!(result::u64_to_u64_map(value.clone(),|item|item+2),value.clone().map(|item|item+2));
        assert_eq!(result::u64_to_bool_map(value.clone(),|item|item+1>=4),value.map(|item|item+1>=4));
    }
}
