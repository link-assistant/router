//! Independent radix caller oracle SOURCE. All native execution is gated CI.
use link_assistant_router::{translation_integer_core as integer, translation_json_fields_core as fields, translation_primitive_option_core as option, translation_text_core as text};

#[test]
fn native_radix_boundaries_retain_signed_and_unsigned_widths() {
    assert_eq!(integer::u8_saturating_add(0xff, 0b1), 255);
    assert_eq!(integer::i8_saturating_abs(-0x80), 127);
    assert_eq!(integer::u16_wrapping_add(0xffff, 0b1), 0);
    assert_eq!(integer::i16_saturating_abs(-0o100000), 32767);
    assert_eq!(integer::u32_wrapping_mul(0xffff_ffff, 0b10), 4_294_967_294);
    assert_eq!(integer::i32_saturating_abs(-0x8000_0000), 2_147_483_647);
    assert_eq!(integer::u64_wrapping_add(0xffff_ffff_ffff_ffff, 0o1), 0);
    assert_eq!(integer::i64_saturating_abs(-0x8000_0000_0000_0000), 9_223_372_036_854_775_807);
    assert_eq!(integer::u128_wrapping_add(0xffff_ffff_ffff_ffff_ffff_ffff_ffff_ffff, 0b1), 0);
    assert_eq!(integer::i128_saturating_abs(-0x8000_0000_0000_0000_0000_0000_0000_0000), 170_141_183_460_469_231_731_687_303_715_884_105_727);
}

#[test]
fn source_and_selected_integer_option_count_and_index_callers_agree() {
    fn original(value: u16) -> u16 {
        let amount: u16 = 0x00_ff;
        let sum = value.saturating_add(amount);
        sum.wrapping_mul(0b10)
    }
    fn selected(value: u16) -> u16 {
        let amount: u16 = 0x00_ff;
        let sum = integer::u16_saturating_add(value, amount);
        integer::u16_wrapping_mul(sum, 0b10)
    }
    for value in [0, 1, u16::MAX - 1, u16::MAX] {
        assert_eq!(original(value), selected(value));
    }
    for value in [None, Some(0_u64), Some(u64::MAX)] {
        assert_eq!(value.unwrap_or(0x2a), option::u64_unwrap_or(value, 42));
    }
    assert_eq!("é😀".repeat(0o2), text::repeat("é😀", 2));
    let value = serde_json::json!([null, "é😀"]);
    assert_eq!(value.get(0b1_usize), fields::json_index(&value, 1));
}
