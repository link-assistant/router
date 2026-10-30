//! Independent native primitive ToString/Display oracle SOURCE, CI-only UNRUN.
use std::cell::Cell;
#[test]
fn primitive_to_string_matches_the_existing_display_abstraction_at_every_width(){
    macro_rules! cases{($($kind:ty),*)=>{$(for value in [<$kind>::MIN,0 as $kind,1 as $kind,<$kind>::MAX]{assert_eq!(value.to_string(),format!("{}",value));})*};}
    cases!(u8,u16,u32,u64,u128,i8,i16,i32,i64,i128);
    for value in [true,false]{assert_eq!(value.to_string(),format!("{}",value));}
    assert_eq!(u128::MAX.to_string(),"340282366920938463463374607431768211455");assert_eq!(i128::MIN.to_string(),"-170141183460469231731687303715884105728");
}
#[test]
fn formatting_preserves_chain_evaluation_once_and_following_text_operations(){
    let calls=Cell::new(0);let source=||{calls.set(calls.get()+1);u64::MAX};let original=source().saturating_add(2).wrapping_mul(3).to_string();assert_eq!(calls.get(),1);calls.set(0);let replacement=format!("{}",source().saturating_add(2).wrapping_mul(3));assert_eq!(calls.get(),1);assert_eq!(original,replacement);assert_eq!(replacement,"18446744073709551613");
    for value in [0_u64,1,u64::MAX]{assert_eq!(value.to_string().trim().to_owned(),format!("{}",value).trim().to_owned());}
    for value in [None,Some(0_u64),Some(u64::MAX)]{assert_eq!(value.map(|item|item.to_string()),value.map(|item|format!("{}",item)));}
    for value in [None,Some(false),Some(true)]{assert_eq!(value.map(|item|item.to_string()),value.map(|item|format!("{}",item)));}
}
