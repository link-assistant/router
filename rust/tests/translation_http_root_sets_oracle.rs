//! Independent multiple-input loan oracle SOURCE. JavaScript-gated Rust CI only.
use link_assistant_router::translation_text_core as text;

fn either<'a>(left: &'a str,right: &'a str,choice: bool) -> &'a str {
    if choice {text::trim(left)} else {text::trim(right)}
}

#[test]
fn shared_return_lifetime_retains_both_possible_original_owners() {
    assert_eq!(either(" é "," 😀 ",true),"é");
    assert_eq!(either(" é "," 😀 ",false),"😀");
    let input = "x";
    let local = text::repeat(input,2);
    assert_eq!(text::repeat(either(&local,input,true),1),"xx");
    assert_eq!(text::repeat(either(&local,input,false),1),"x");
}
