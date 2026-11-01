// Native independent oracle SOURCE ONLY, UNRUN and UNSCHEDULED. Root must
// attach only after the original eight same-SHA JS gates. No copied compiler
// profile is required for these original public owners; no pointer identity ABI.
use link_assistant_router::clients::{ClientIntegration, ClientKind};
fn integration(input: ClientKind) -> &'static ClientIntegration { input.integration() }
fn command(input: ClientKind) -> &'static str { input.command() }
fn display_name(input: ClientKind) -> &'static str { input.display_name() }
fn dialect(input: ClientKind) -> &'static str { input.dialect() }
fn token_env(input: ClientKind) -> Option<&'static str> { input.token_env() }
fn base_url_env(input: ClientKind) -> Option<&'static str> { input.base_url_env() }
fn setup_limitation(input: ClientKind) -> Option<&'static str> { input.setup_limitation() }
fn canonical_name(input: ClientKind) -> &'static str { input.canonical_name() }
fn legacy_name(input: ClientKind) -> &'static str { input.legacy_name() }
// Changed native caller is deliberately a DIFFERENT body, same real type.
fn edited_command(input: ClientKind) -> &'static str { input.display_name() }
#[test]
fn literal_metadata_for_all_real_variants() {
    let cases = [
        (ClientKind::Codex,"codex","Codex CLI","OpenAI Responses",Some("LINK_ASSISTANT_TOKEN"),None,"codex"),
        (ClientKind::ClaudeCode,"claude","Claude Code","Anthropic Messages",Some("ANTHROPIC_AUTH_TOKEN"),Some("ANTHROPIC_BASE_URL"),"claude-code"),
        (ClientKind::Cursor,"cursor-agent","Cursor CLI","Cursor private",None,None,"cursor"),
        (ClientKind::GeminiCli,"gemini","Gemini CLI","Gemini native",Some("GEMINI_API_KEY"),Some("GOOGLE_GEMINI_BASE_URL"),"gemini-cli"),
        (ClientKind::GrokCli,"grok","Grok CLI","OpenAI Chat",Some("GROK_API_KEY"),Some("GROK_BASE_URL"),"grok-cli"),
        (ClientKind::Opencode,"opencode","OpenCode","OpenAI Chat",Some("LINK_ASSISTANT_TOKEN"),None,"opencode"),
        (ClientKind::QwenCode,"qwen","Qwen Code","OpenAI Chat",Some("LINK_ASSISTANT_TOKEN"),Some("OPENAI_BASE_URL"),"qwen-code"),
        (ClientKind::Agent,"agent","Link.Assistant Agent","OpenAI Chat",Some("LINK_ASSISTANT_TOKEN"),None,"agent"),
    ];
    for (kind, expected_command, expected_name, expected_dialect, expected_token, expected_base, expected_legacy) in cases {
        assert_eq!(command(kind), expected_command);
        assert_eq!(canonical_name(kind), expected_command);
        assert_eq!(display_name(kind), expected_name);
        assert_eq!(dialect(kind), expected_dialect);
        assert_eq!(token_env(kind), expected_token);
        assert_eq!(base_url_env(kind), expected_base);
        assert_eq!(legacy_name(kind), expected_legacy);
        let value: &'static ClientIntegration = integration(kind);
        assert_eq!(value.kind, kind);
        assert_eq!(value.command, expected_command);
        assert_eq!(value.name, expected_name);
        assert_eq!(edited_command(kind), expected_name);
    }
}
#[test]
fn literal_none_and_setup_limitations_with_static_lifetimes() {
    assert_eq!(setup_limitation(ClientKind::Codex), None);
    assert_eq!(setup_limitation(ClientKind::ClaudeCode), None);
    assert_eq!(setup_limitation(ClientKind::Cursor), Some("Cursor CLI accepts CURSOR_API_ENDPOINT, but speaks Connect-RPC over an unversioned private agent.v1/aiserver.v1 protocol rather than a supported vendor API; native Cursor routing is not implemented. See docs/use-cases/cli-cursor.md for the support tier, the scoped adapter work, and the opt-in TLS-proxy route"));
    assert_eq!(setup_limitation(ClientKind::GeminiCli), Some("Gemini CLI permanent setup is unavailable because its individual Code Assist flow aborts with IneligibleTierError; use `link-assistant-router with gemini` for isolated API-key mode"));
    assert_eq!(setup_limitation(ClientKind::GrokCli), None);
    assert_eq!(setup_limitation(ClientKind::Opencode), None);
    assert_eq!(setup_limitation(ClientKind::QwenCode), None);
    assert_eq!(setup_limitation(ClientKind::Agent), None);
    // Uses real borrowed fields without moving an owner or retaining a target
    // pointer guarantee. No borrowed slice/trait ABI is broadened by this test.
    let owners: &'static [&'static str] = integration(ClientKind::Codex).model_owners;
    assert_eq!(owners, &["openai", "z.ai"]);
}
