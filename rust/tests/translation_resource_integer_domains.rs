//! Independent all-width reverse scalar core oracle SOURCE, CI-only UNRUN.
use link_assistant_router::translation_integer_core as integer;
#[test]
fn every_selected_native_scalar_operation_and_display_keeps_its_own_width(){
    macro_rules! cases{($(($kind:ty,$operation:ident)),*)=>{$(for value in [<$kind>::MIN,0 as $kind,1 as $kind,<$kind>::MAX]{assert_eq!(integer::$operation(value,1),value.saturating_add(1));assert_eq!(link_assistant_router::translation_core::format!("{}",value),value.to_string());})*};}
    cases!((u8,u8_saturating_add),(u16,u16_saturating_add),(u32,u32_saturating_add),(u64,u64_saturating_add),(u128,u128_saturating_add),(i8,i8_saturating_add),(i16,i16_saturating_add),(i32,i32_saturating_add),(i64,i64_saturating_add),(i128,i128_saturating_add));
    let mut value=integer::i8_saturating_add(0,0);assert_eq!(value,0);value=-1;assert_eq!(link_assistant_router::translation_core::format!("{}",value),"-1");assert!(-1_i8<0_i8);
}
