//! Independent fixed-width selection/edge oracle SOURCE. CI-only UNRUN.
macro_rules! edge {
    ($name:ident,$kind:ty)=>{#[test]fn $name(){fn selected(_left:$kind,right:$kind)->$kind{right}assert_eq!(selected(<$kind>::MIN,<$kind>::MAX),<$kind>::MAX);assert_eq!(selected(<$kind>::MAX,<$kind>::MIN),<$kind>::MIN);assert_eq!(selected(0,0),0);}};
}
edge!(u8_edges,u8);edge!(u16_edges,u16);edge!(u32_edges,u32);edge!(u64_edges,u64);edge!(u128_edges,u128);
edge!(i8_edges,i8);edge!(i16_edges,i16);edge!(i32_edges,i32);edge!(i64_edges,i64);edge!(i128_edges,i128);
