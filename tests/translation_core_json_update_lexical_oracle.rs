//! Independent native behavior for lexical JSON update adoption.
//! This is discovered by cargo test in gated CI; no local Rust was run.
use link_assistant_router::translation_core::{self, Json, Str};

fn sibling_if(flag: bool) -> Json {
    if flag {
        let mut doc = translation_core::json!({"branch": "left"});
        doc["ok"] = translation_core::json!(true);
        doc
    } else {
        let mut doc = translation_core::json!({"branch": "right"});
        doc["ok"] = translation_core::json!(false);
        doc
    }
}

fn sibling_match(kind: &Str) -> Json {
    match kind {
        "text" => {
            let mut block = translation_core::json!({"kind": "text"});
            block["cache"] = translation_core::json!(true);
            block
        }
        "image" | "input_image" => {
            let mut block = translation_core::json!({"kind": "image"});
            block["cache"] = translation_core::json!(false);
            block
        }
        _ => {
            let mut block = translation_core::json!({"kind": "other"});
            block["cache"] = translation_core::json!(true);
            block
        }
    }
}

fn nested() -> Json {
    let first = {
        let mut doc = translation_core::json!({});
        doc["value"] = translation_core::json!(true);
        doc
    };
    let second = {
        let mut doc = translation_core::json!({});
        doc["value"] = translation_core::json!(false);
        doc
    };
    translation_core::json!({"first": first, "second": second})
}

fn simultaneous() -> Json {
    let mut first = translation_core::json!({});
    first["a"] = translation_core::json!(true);
    let mut second = translation_core::json!({});
    second["b"] = translation_core::json!(false);
    translation_core::json!({"first": first, "second": second})
}

#[test]
fn sibling_if_uses_only_the_selected_binding() {
    assert_eq!(sibling_if(true), serde_json::json!({"branch": "left", "ok": true}));
    assert_eq!(sibling_if(false), serde_json::json!({"branch": "right", "ok": false}));
}

#[test]
fn sibling_match_keeps_alternative_order_and_unicode_fallback() {
    for (kind, expected, cache) in [
        ("text", "text", true),
        ("image", "image", false),
        ("input_image", "image", false),
        ("Ω😀", "other", true),
    ] {
        assert_eq!(sibling_match(kind), serde_json::json!({"kind": expected, "cache": cache}));
    }
}

#[test]
fn successive_scopes_keep_distinct_owned_values() {
    assert_eq!(nested(), serde_json::json!({"first": {"value": true}, "second": {"value": false}}));
}

#[test]
fn distinct_live_bindings_preserve_both_outputs() {
    assert_eq!(simultaneous(), serde_json::json!({"first": {"a": true}, "second": {"b": false}}));
}

#[test]
fn rhs_is_evaluated_before_the_owned_base_is_replaced() {
    let mut events = Vec::new();
    let mut doc = translation_core::json!({});
    doc["x"] = {
        events.push("rhs");
        translation_core::json!(true)
    };
    events.push("after");
    assert_eq!(events, ["rhs", "after"]);
    assert_eq!(doc, serde_json::json!({"x": true}));
}

#[test]
#[allow(clippy::nonminimal_bool)] // Preserve the original logical interpolation syntax.
fn raw_strings_and_conditional_writes_keep_literal_bytes() {
    for flag in [true, false] {
        let mut doc = translation_core::json!({"raw": r#"Ω😀 { doc }"#});
        if flag {
            doc[r#"猫"#] = translation_core::json!(!false || false);
        } else {
            doc[r#"猫"#] = translation_core::json!(false);
        }
        assert_eq!(doc, serde_json::json!({"raw": "Ω😀 { doc }", "猫": flag}));
    }
}
