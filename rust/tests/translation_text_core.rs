//! Independent UTF-8 boundary oracle source. Execute only in JS-gated Rust CI.
use link_assistant_router::translation_text_core as text;

#[test]
fn unicode_whitespace_retains_bom_and_handles_next_line() {
    assert_eq!(text::trim("\u{85} 世界 😀\n"), "世界 😀");
    assert_eq!(text::trim("\u{feff}x\u{feff}"), "\u{feff}x\u{feff}");
    assert_eq!(text::trim("\u{180e}x\u{200b}"), "\u{180e}x\u{200b}");
    assert_eq!(text::trim_start("\t x\n"), "x\n");
    assert_eq!(text::trim_end("\t x\n"), "\t x");
}

#[test]
fn searches_and_slices_keep_utf8_offsets() {
    assert_eq!(text::len_utf8("a😀b"), 6);
    assert_eq!(text::len_chars("a😀b"), 3);
    assert_eq!(text::find("a😀b", "b"), Some(5));
    assert_eq!(text::rfind("a😀b", ""), Some(6));
    assert_eq!(text::slice_bytes("a😀b", 1, 5), Some("😀"));
    assert_eq!(text::slice_bytes("a😀b", 2, 5), None);
    assert_eq!(text::slice_bytes("a😀b", 6, 6), Some(""));
    assert_eq!(text::take_chars("a😀b", 2), "a😀");
    assert_eq!(text::drop_chars("a😀b", 1), "😀b");
    assert_eq!(text::drop_chars("a😀b", u64::MAX), "");
}

#[test]
fn replacement_dollars_and_empty_patterns_remain_literal() {
    assert_eq!(text::replace("😀", "", "$&"), "$&😀$&");
    assert_eq!(text::replacen("😀", "", "_", 1), "_😀");
    assert_eq!(text::replacen("aaaa", "aa", "$1", 1), "$1aa");
    assert_eq!(text::matches_count("aaa", "aa"), 1);
    assert_eq!(text::matches_count("😀", ""), 2);
    assert_eq!(text::repeat("", u64::MAX), "");
    assert_eq!(text::repeat("😀", 2), "😀😀");
    assert_eq!(text::strip_prefix("😀abc", "😀"), Some("abc"));
    assert_eq!(text::strip_suffix("abc😀", "😀"), Some("abc"));
}

#[test]
#[should_panic(expected = "text output bound")]
fn output_bound_precedes_large_repeat_allocation() {
    let _ = text::repeat("x", u64::MAX);
}
