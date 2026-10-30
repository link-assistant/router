// Independent native usize/UTF-8 count oracle SOURCE; gated CI only.
use link_assistant_router::translation_text_core as core;
#[test]
fn immutable_native_counts_preserve_repeat_and_replacement_values() {
    for (value, count, wanted) in [("é😀", 2_usize, "é😀é😀"), ("é😀", 0, ""), ("x", 3, "xxx")] {
        let amount = count;
        assert_eq!(value.repeat(amount), wanted);
        assert_eq!(core::repeat(value, amount as u64), wanted);
    }
    let amount = 3_usize;
    assert_eq!(core::repeat("x", amount as u64), "xxx");
    let count = 2_usize;
    assert_eq!("xxx".replacen("x", "$&", count), "$&$&x");
    assert_eq!(core::replacen("xxx", "x", "$&", count as u64), "$&$&x");
}
#[test]
fn native_length_aliases_count_utf8_bytes_for_repetition() {
    for (value, count, wanted) in [("", 0_usize, ""), ("é", 2, "éé"), ("😀", 4, "😀😀😀😀")] {
        let amount = value.len();
        assert_eq!(amount, count);
        assert_eq!(value.repeat(amount), wanted);
        assert_eq!(core::repeat(value, amount as u64), wanted);
    }
}
