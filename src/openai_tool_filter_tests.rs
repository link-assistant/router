use super::*;

/// Codex CLI sends `namespace`, `custom` and `tool_search` alongside ordinary
/// function tools. Rejecting the whole request over one untranslatable entry
/// refused nine usable tools and made a documented client unable to drive Claude
/// models at all (issue #215). The unknown entries are dropped; the rest survive.
#[test]
fn untranslatable_tools_are_dropped_rather_than_failing_the_request() {
    let tools = json!([
        {"type": "function", "name": "exec_command"},
        {"type": "function", "name": "write_stdin"},
        {"type": "function", "name": "update_plan"},
        {"type": "function", "name": "request_user_input"},
        {"type": "function", "name": "view_image"},
        {"type": "namespace", "name": "multi_agent_v1"},
        {"type": "function", "name": "get_goal"},
        {"type": "function", "name": "create_goal"},
        {"type": "function", "name": "update_goal"},
        {"type": "web_search"}
    ]);

    let translated = crate::openai::translate_tools(&tools);
    let translated = translated
        .as_array()
        .expect("translated tools are an array");
    assert_eq!(translated.len(), 9, "{translated:#?}");
    let rendered = serde_json::to_string(&translated).expect("serialize");
    assert!(!rendered.contains("multi_agent_v1"), "{rendered}");
    assert!(!rendered.contains("namespace"), "{rendered}");
    assert!(rendered.contains("exec_command"), "{rendered}");
    assert!(rendered.contains("input_schema"), "{rendered}");
    assert!(rendered.contains("web_search_20250305"), "{rendered}");
    assert_eq!(
        crate::openai::untranslatable_anthropic_tools(&tools),
        vec!["namespace (multi_agent_v1)".to_string()]
    );
}

#[test]
fn every_untranslatable_codex_tool_type_is_handled() {
    for kind in ["namespace", "custom", "tool_search"] {
        let tools = json!([
            {"type": "function", "name": "kept"},
            {"type": kind, "name": "dropped_one"}
        ]);
        let translated = crate::openai::translate_tools(&tools);
        let translated = translated.as_array().expect("array");
        assert_eq!(translated.len(), 1, "{kind}: {translated:#?}");
        assert_eq!(translated[0]["name"], "kept", "{kind}");
        assert_eq!(
            crate::openai::untranslatable_anthropic_tools(&tools),
            vec![format!("{kind} (dropped_one)")],
            "{kind}"
        );
    }
}

#[test]
fn a_wholly_untranslatable_tool_set_yields_an_empty_list() {
    let tools = json!([
        {"type": "namespace", "name": "a"},
        {"type": "tool_search"}
    ]);
    let translated = crate::openai::translate_tools(&tools);
    assert_eq!(translated, json!([]), "{translated}");
    assert_eq!(
        crate::openai::untranslatable_anthropic_tools(&tools),
        vec!["namespace (a)".to_string(), "tool_search".to_string()]
    );
}

#[test]
fn a_nameless_function_tool_is_dropped() {
    let tools = json!([{"type": "function"}, {"type": "function", "name": ""}]);
    assert_eq!(crate::openai::translate_tools(&tools), json!([]));
    assert_eq!(
        crate::openai::untranslatable_anthropic_tools(&tools).len(),
        2
    );
}
