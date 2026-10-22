//! Independent reverse ASCII witness. Rust runs only after the same-SHA JS gate.
use link_assistant_router::translation_core;

#[allow(clippy::needless_raw_string_hashes)]
pub const REVERSE_ASCII_JS_WITNESS: &str = r###"import {router_core_ascii_chars_in as ascii} from './runtime/string-iterator-runtime.mjs';
/**
 * @param {Parameters<typeof ascii>[0]} value
 * @param {Parameters<typeof ascii>[1]} alphabet
 * @returns {ReturnType<typeof ascii>}
 */
export function accepted(value,alphabet){return ascii(value,alphabet);}
/** @param {string} value */
export function hexadecimal(value){const alphabet='0123456789ABCDEFabcdef';return ascii(value,alphabet);}
/**
 * @param {string} value
 * @param {string} alphabet
 * @param {boolean} yes
 */
export function lazy(value,alphabet,yes){return yes&&ascii(value,alphabet);}
/**
 * @param {string} value
 * @param {string} alphabet
 */
export function guard(value,alphabet){if(ascii(value,alphabet)){return value;}else{return '';}}
"###;

#[allow(clippy::needless_raw_string_hashes)]
pub const REVERSE_SCALAR_JS_WITNESS: &str = r###"import {router_core_unicode_scalar_count as count} from './runtime/string-iterator-runtime.mjs';
/** @param {string} value */
export function scalar_length(value){return count(value);}
/** @param {string} value */
export function scalar_limit(value){return count(value)<=64n;}
/** @param {string} value @param {boolean} yes */
export function selected_count(value,yes){return yes?count(value):0n;}
"###;

// This module is produced by the actual source/CST/semantic reverse pipeline.
#[allow(clippy::needless_return, clippy::used_underscore_binding)]
#[path = "../../tools/translation/js-to-rust/generated/owned-ascii-witness.rs"]
mod reverse_generated;

#[test]
fn actual_reverse_projection_counts_unicode_scalars() {
    for (value, expected) in [
        ("", 0_u64),
        ("ASCII", 5),
        ("é", 1),
        ("猫😀", 2),
        ("e\u{301}", 2),
        ("👩\u{200d}💻", 3),
        ("\0\r\n", 3),
        ("\u{10ffff}", 1),
    ] {
        assert_eq!(reverse_generated::scalar_length(value), expected);
        assert_eq!(reverse_generated::selected_count(value, true), expected);
        assert_eq!(reverse_generated::selected_count(value, false), 0);
        assert!(reverse_generated::scalar_limit(value));
    }
    for (size, accepted) in [(64, true), (65, false)] {
        let value = "😀".repeat(size);
        assert_eq!(reverse_generated::scalar_limit(&value), accepted);
        assert_eq!(reverse_generated::scalar_length(&value), size as u64);
    }
}

#[test]
fn actual_reverse_projection_preserves_ascii_scalar_domain() {
    for (value, alphabet, expected) in [
        ("", "", true),
        ("", "é猫😀", true),
        ("a", "", false),
        ("aAa0-_", "aA0-_", true),
        ("é", "é", false),
        ("猫😀", "猫😀", false),
        ("A", "aé猫😀", false),
        ("a", "aé猫😀", true),
        ("\0\r\n", "\0\r\n", true),
        ("e\u{301}", "e\u{301}", false),
        ("\u{7f}", "\u{7f}", true),
        ("/", ".-_", false),
    ] {
        assert_eq!(reverse_generated::accepted(value, alphabet), expected);
        assert!(!reverse_generated::lazy(value, alphabet, false));
        assert_eq!(reverse_generated::lazy(value, alphabet, true), expected);
        assert_eq!(
            reverse_generated::guard(value, alphabet),
            if expected { value } else { "" }
        );
    }
    for byte in 0u8..=127 {
        assert_eq!(
            reverse_generated::hexadecimal(&char::from(byte).to_string()),
            byte.is_ascii_hexdigit()
        );
    }
}
