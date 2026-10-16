//! Shared compatibility-core behavior. UNRUN locally; Rust executes in CI only.
use link_assistant_router::translation_core::{self, Text};

#[test]
fn compatibility_primitive_format_cases() {
    let value: Text = translation_core::format!("core {{text}}");
    assert_eq!(value, "core {text}");
    assert_eq!(translation_core::format!("{:<5}", "Ω"), "Ω    ");
    assert_eq!(translation_core::format!("{:>4}", "xy"), "  xy");
    assert_eq!(translation_core::format!("{:*^5}", "猫"), "**猫**");
    assert_eq!(translation_core::format!("{:.2}", "😀猫x"), "😀猫");
    assert_eq!(translation_core::format!("{:#06x}", 42u8), "0x002a");
    assert_eq!(translation_core::format!("{}", true), "true");
    assert_eq!(translation_core::format!("{0}/{0}/{word}", "x", word = "y"), "x/x/y");
    assert_eq!(translation_core::format!(r##"{{{}}} Ω"##, "ok"), "{ok} Ω");
}

#[test]
fn compatibility_operands_are_left_to_right_once() {
    let mut tape = Vec::new();
    let output = translation_core::format!("{0}:{1}:{0}", { tape.push(1); 2u8 }, { tape.push(2); 3u8 });
    assert_eq!(output, "2:3:2");
    assert_eq!(tape, vec![1, 2]);
}

#[test]
fn real_accounts_header_matches_the_declared_shared_case() {
    assert_eq!(link_assistant_router::accounts_cli::header(), "name              healthy   credential    used    limit      remaining  home");
}
