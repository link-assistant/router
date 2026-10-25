//! Independent owned text state SOURCE. JavaScript-gated Rust CI only.
use link_assistant_router::{translation_text_core as text,translation_integer_core as integer};

fn doubled(input: &str,limit: u64) -> String {
    let mut current = text::repeat(input,1);
    let mut count = 0;
    while count < limit {
        current = text::repeat(&current,2);
        count = integer::u64_saturating_add(count,1);
    }
    current
}

#[test]
fn owned_replacement_and_reinitialization_keep_unicode_and_original_values() {
    assert_eq!(doubled("é😀",0),"é😀");
    assert_eq!(doubled("é😀",1),"é😀é😀");
    assert_eq!(doubled("é😀",2),"é😀é😀é😀é😀");
    let mut current = text::repeat("a",1);
    let previous = current;
    current = text::repeat(&previous,2);
    assert_eq!(current,"aa");
    current = text::replace(text::trim(&text::repeat(" x ",1)),"x","é");
    assert_eq!(current,"é");
}
