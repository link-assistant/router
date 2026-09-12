//! Claude presentation-default tests for temporary client launches.
//!
//! Split from `with_command_tests.rs` to stay inside the repository's
//! per-file line limit.

use super::*;

/// Issue #560: genuine thinking was visible while a response streamed and
/// collapsed to `Thought for Ns` the moment it completed, under a bare
/// `router with claude` only. The Router-owned profile starts empty by design,
/// so it carried none of the presentation preferences the user's own profile
/// has, and the process-local settings set the picker without setting this.
///
/// A catalog with no extra picker rows is exactly as affected, so the
/// presentation default must not depend on the picker having something to say.
#[test]
fn a_default_claude_launch_keeps_completed_thinking_visible() {
    for models in [
        // Nothing for the picker to add: every row is either Anthropic-owned or
        // a built-in family name.
        json!([
            {"id": "future-native-id", "owned_by": "anthropic"},
            {"id": "sonnet", "owned_by": "z.ai", "client_capabilities": {"claude": {"behaves_as": "claude-sonnet-4-5", "source": "provider-protocol:z.ai-anthropic"}}}
        ]),
        // An empty catalog, which reaches the same early return.
        json!([]),
    ] {
        let profiles = tempfile::tempdir().expect("profile root");
        let models: Vec<RouterModel> =
            serde_json::from_value(models).expect("deserialize catalog fixture");
        let prepared = TemporaryClient::prepare(&Preparation {
            client: ClientKind::ClaudeCode,
            base_url: "http://router.test",
            token: "task-token",
            model_override: None,
            models: &models,
            isolated_config: false,
            extend_user_configuration: false,
            one_shot: false,
            profile_root: Some(profiles.path()),
            codex_reasoning_effort: None,
            codex_backend_base_url: None,
            ca_cert: None,
        })
        .expect("prepare a default Claude launch");
        let arguments = prepared
            .command
            .get_args()
            .map(|argument| argument.to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        let settings = arguments
            .windows(2)
            .find_map(|pair| (pair[0] == "--settings").then_some(&pair[1]))
            .expect("a bare launch must still carry process-local settings");
        let settings: serde_json::Value =
            serde_json::from_str(settings).expect("valid settings JSON");
        assert_eq!(
            settings.get("verbose"),
            Some(&json!(true)),
            "a bare launch must keep completed thinking visible: {settings}"
        );
        // Only presentation is set. Router must not enable a provider-side
        // thinking mode or otherwise touch the protocol contract from #546/#554.
        assert_eq!(
            settings.get("modelPicker"),
            None,
            "no filtered rows means no picker to write: {settings}"
        );
        assert_eq!(
            settings.as_object().map(serde_json::Map::len),
            Some(1),
            "the process-local settings carry nothing else: {settings}"
        );
    }
}

/// The presentation default is a *default*: Router writes its `--settings`
/// before the user's own arguments, so a forwarded `--settings` or Claude's own
/// flag is the last one Claude applies and still wins (issue #560).
#[test]
fn router_settings_precede_forwarded_claude_arguments() {
    let profiles = tempfile::tempdir().expect("profile root");
    let models: Vec<RouterModel> = serde_json::from_value(json!([
        {"id": "future-glm-alpha", "owned_by": "z.ai", "client_capabilities": {"claude": {"behaves_as": "claude-sonnet-4-5", "source": "provider-protocol:z.ai-anthropic"}}}
    ]))
    .expect("deserialize catalog fixture");
    let mut prepared = TemporaryClient::prepare(&Preparation {
        client: ClientKind::ClaudeCode,
        base_url: "http://router.test",
        token: "task-token",
        model_override: None,
        models: &models,
        isolated_config: false,
        extend_user_configuration: false,
        one_shot: false,
        profile_root: Some(profiles.path()),
        codex_reasoning_effort: None,
        codex_backend_base_url: None,
        ca_cert: None,
    })
    .expect("prepare a default Claude launch");
    // The same append `launch` performs before spawning.
    prepared
        .command
        .args([std::ffi::OsString::from("--settings"), "{}".into()]);
    let arguments = prepared
        .command
        .get_args()
        .map(|argument| argument.to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    let occurrences = arguments
        .iter()
        .enumerate()
        .filter_map(|(index, argument)| (argument == "--settings").then_some(index))
        .collect::<Vec<_>>();
    assert_eq!(occurrences.len(), 2, "{arguments:?}");
    assert!(
        occurrences[0] < occurrences[1],
        "Router's settings must come first so the user's override wins: {arguments:?}"
    );
    let router_settings: serde_json::Value =
        serde_json::from_str(&arguments[occurrences[0] + 1]).expect("valid settings JSON");
    assert_eq!(router_settings.get("verbose"), Some(&json!(true)));
}
