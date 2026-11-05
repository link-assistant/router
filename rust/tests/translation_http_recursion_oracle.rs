//! Independent closed recursive behavior SOURCE. JavaScript-gated Rust CI only.
use link_assistant_router::translation_text_core as text;

fn recursive(flag: bool) -> bool {if flag {recursive(false)} else {true}}
fn first(flag: bool) -> bool {if flag {second(false)} else {false}}
fn second(flag: bool) -> bool {first(flag)}
fn expanded(input: &str,done: bool) -> String {
    if done {text::repeat(input,1)} else {expanded(input,true)}
}
fn amount(flag: bool) -> u64 {if flag {amount(false)} else {0}}

#[test]
fn explicit_recursive_groups_preserve_scalar_and_owned_outputs() {
    for flag in [true,false] {
        assert!(recursive(flag));
        assert!(!first(flag));
        assert_eq!(amount(flag),0);
    }
    assert_eq!(expanded("é😀",false),"é😀");
    assert_eq!(expanded("x",true),"x");
}
