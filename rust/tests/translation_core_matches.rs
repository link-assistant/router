//! Native compatibility oracle; CI only after the complete JavaScript gate.
use link_assistant_router::translation_core;

#[test]
fn literal_patterns_preserve_value_and_subject_order() {
    assert!(translation_core::matches!("--config", "-c" | "--config"));
    assert!(!translation_core::matches!("😀", "-c" | "--config"));
    assert!(translation_core::matches!(255_u8, 0_u8 | 255_u8));
    assert!(translation_core::matches!(true, true));
    let mut calls = 0;
    let selected = translation_core::matches!(
        {
            calls += 1;
            7_u8
        },
        3_u8 | 7_u8
    );
    assert!(selected);
    assert_eq!(calls, 1);
}

// Complete original production functions; only the explicit macro API is adopted.
fn codex_root_option_takes_value(argument: &crate::translation_core::Str) -> bool {
    crate::translation_core::matches!(
        argument,
        "-c" | "--config"
            | "--enable"
            | "--disable"
            | "-i"
            | "--image"
            | "-m"
            | "--model"
            | "--local-provider"
            | "--profile"
            | "-s"
            | "--sandbox"
            | "-a"
            | "--ask-for-approval"
            | "-C"
            | "--cd"
            | "--add-dir"
    )
}

fn codex_root_boolean_option(argument: &crate::translation_core::Str) -> bool {
    crate::translation_core::matches!(
        argument,
        "--oss"
            | "--search"
            | "--full-auto"
            | "--dangerously-bypass-approvals-and-sandbox"
            | "--no-alt-screen"
            | "-h"
            | "--help"
            | "-V"
            | "--version"
    )
}

#[test]
fn complete_original_client_launch_option_predicates() {
    let values = [
        "-c",
        "--config",
        "--enable",
        "--disable",
        "-i",
        "--image",
        "-m",
        "--model",
        "--local-provider",
        "--profile",
        "-s",
        "--sandbox",
        "-a",
        "--ask-for-approval",
        "-C",
        "--cd",
        "--add-dir",
    ];
    let flags = [
        "--oss",
        "--search",
        "--full-auto",
        "--dangerously-bypass-approvals-and-sandbox",
        "--no-alt-screen",
        "-h",
        "--help",
        "-V",
        "--version",
    ];
    for value in values {
        assert!(codex_root_option_takes_value(value));
        assert!(!codex_root_boolean_option(value));
    }
    for value in flags {
        assert!(codex_root_boolean_option(value));
        assert!(!codex_root_option_takes_value(value));
    }
    for value in ["", "--missing", "😀"] {
        assert!(!codex_root_option_takes_value(value));
        assert!(!codex_root_boolean_option(value));
    }
}
