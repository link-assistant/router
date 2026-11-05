// Independent native literal boundary oracles. CI ONLY; ALL UNRUN.
#[test]
fn binary_literal_boundaries_match_native_primitive_constants() {
    { let maximum: u8 = 0b11111111; let minimum: u8 = 0b0; assert_eq!(maximum, u8::MAX); assert_eq!(minimum, u8::MIN); }
    { let maximum: i8 = 0b1111111; let minimum: i8 = -0b10000000; assert_eq!(maximum, i8::MAX); assert_eq!(minimum, i8::MIN); }
    { let maximum: u16 = 0b1111111111111111; let minimum: u16 = 0b0; assert_eq!(maximum, u16::MAX); assert_eq!(minimum, u16::MIN); }
    { let maximum: i16 = 0b111111111111111; let minimum: i16 = -0b1000000000000000; assert_eq!(maximum, i16::MAX); assert_eq!(minimum, i16::MIN); }
    { let maximum: u32 = 0b11111111111111111111111111111111; let minimum: u32 = 0b0; assert_eq!(maximum, u32::MAX); assert_eq!(minimum, u32::MIN); }
    { let maximum: i32 = 0b1111111111111111111111111111111; let minimum: i32 = -0b10000000000000000000000000000000; assert_eq!(maximum, i32::MAX); assert_eq!(minimum, i32::MIN); }
    { let maximum: u64 = 0b1111111111111111111111111111111111111111111111111111111111111111; let minimum: u64 = 0b0; assert_eq!(maximum, u64::MAX); assert_eq!(minimum, u64::MIN); }
    { let maximum: i64 = 0b111111111111111111111111111111111111111111111111111111111111111; let minimum: i64 = -0b1000000000000000000000000000000000000000000000000000000000000000; assert_eq!(maximum, i64::MAX); assert_eq!(minimum, i64::MIN); }
    { let maximum: u128 = 0b11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111; let minimum: u128 = 0b0; assert_eq!(maximum, u128::MAX); assert_eq!(minimum, u128::MIN); }
    { let maximum: i128 = 0b1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111; let minimum: i128 = -0b10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000; assert_eq!(maximum, i128::MAX); assert_eq!(minimum, i128::MIN); }
}
