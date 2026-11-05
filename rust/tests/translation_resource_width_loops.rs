//! Independent all-width strict range counter oracle SOURCE, CI-only UNRUN.
use link_assistant_router::translation_integer_core as integer;
#[test]
fn strict_bounds_keep_all_width_unit_updates_inside_the_native_domain(){
    macro_rules! cases{($(($kind:ty,$add:ident,$sub:ident)),*)=>{$(let mut count=0_u64;let mut index=<$kind>::MAX-1;while index < <$kind>::MAX{count+=1;index=integer::$add(index,1);}assert_eq!(count,1);let mut count=0_u64;let mut index=<$kind>::MIN+1;while index > <$kind>::MIN{count+=1;index=integer::$sub(index,1);}assert_eq!(count,1);let mut count=0_u64;let mut index=0 as $kind;while index<3{if index==1{index=integer::$add(index,1);continue;}count+=1;index=integer::$add(index,1);}assert_eq!(count,2);)*};}
    cases!((u8,u8_saturating_add,u8_saturating_sub),(u16,u16_saturating_add,u16_saturating_sub),(u32,u32_saturating_add,u32_saturating_sub),(u64,u64_saturating_add,u64_saturating_sub),(u128,u128_saturating_add,u128_saturating_sub),(i8,i8_saturating_add,i8_saturating_sub),(i16,i16_saturating_add,i16_saturating_sub),(i32,i32_saturating_add,i32_saturating_sub),(i64,i64_saturating_add,i64_saturating_sub),(i128,i128_saturating_add,i128_saturating_sub));
}
