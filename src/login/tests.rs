use super::*;

#[test]
fn tui_only_types_into_recognized_screens() {
    let progress = TuiProgress::default();
    let rendered_theme = crate::login_pty::strip_ansi(
        "Choose\x1b[9Gthe\x1b[13Gtext\x1b[18Gstyle\x1b[24Gthat\x1b[29Glooks\x1b[35Gbest\x1b[40Gwith\x1b[45Gyour\x1b[50Gterminal",
    );
    assert_eq!(
        next_tui_action(&rendered_theme, &progress),
        Some(TuiAction::AcceptTheme)
    );
    assert_eq!(
        next_tui_action("A future, unknown onboarding screen", &progress),
        None
    );
}

#[test]
fn login_config_defaults_to_bare_tui() {
    assert!(LoginConfig::default().args.is_empty());
}

#[test]
fn compacted_oauth_verdicts_are_restored_for_api_errors() {
    assert_eq!(
        rejection_verdict("promptOAutherror:Invalidcode.Pleasemakesurethefullcodewascopied"),
        "OAuth error: Invalid code. Please make sure the full code was copied"
    );
    assert_eq!(
        rejection_verdict("promptOAutherror:Requestfailedwithstatuscode400"),
        "OAuth error: Request failed with status code 400"
    );
}

fn settled_session(id: &str, status: LoginStatus, age: chrono::Duration) -> Arc<Session> {
    Arc::new(Session {
        id: id.to_string(),
        provider: SubscriptionProvider::Claude,
        url: "https://claude.ai/oauth/authorize".to_string(),
        user_code: None,
        deadline: Utc::now() + chrono::Duration::seconds(900),
        state: Mutex::new(SessionState {
            status,
            expires_at: None,
            error: None,
            pty: None,
            auth_task: None,
            settled_at: Some(Utc::now() - age),
        }),
    })
}

#[test]
fn finished_sessions_are_evicted_once_their_result_has_been_retained() {
    let manager = LoginManager::new(LoginConfig::default());
    let fresh = settled_session("fresh", LoginStatus::Authorized, chrono::Duration::zero());
    let stale = settled_session(
        "stale",
        LoginStatus::Failed,
        terminal_retention() + chrono::Duration::seconds(1),
    );
    {
        let mut sessions = manager.lock_sessions();
        sessions.insert("fresh".to_string(), fresh);
        sessions.insert("stale".to_string(), stale);
    }
    manager.sweep();
    assert!(manager.status("fresh").is_some());
    assert!(manager.status("stale").is_none());
}

#[test]
fn an_expired_session_becomes_evictable() {
    let manager = LoginManager::new(LoginConfig::default());
    let session = Arc::new(Session {
        id: "gone".to_string(),
        provider: SubscriptionProvider::Claude,
        url: String::new(),
        user_code: None,
        deadline: Utc::now() - chrono::Duration::seconds(1),
        state: Mutex::new(SessionState {
            status: LoginStatus::AwaitingCode,
            expires_at: None,
            error: None,
            pty: None,
            auth_task: None,
            settled_at: None,
        }),
    });
    manager
        .lock_sessions()
        .insert("gone".to_string(), Arc::clone(&session));
    manager.sweep();
    assert_eq!(session.view().status, LoginStatus::Expired);
    let settled = session
        .state
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .settled_at;
    assert!(settled.is_some());
}

#[test]
fn a_failure_excerpt_carries_neither_the_token_nor_the_pasted_code() {
    let code = "authcode-9f3a2b7c";
    let transcript =
        format!("Paste code: {code}\nrejected\nleftover token sk-ant-oat01-SECRETVALUE0001\n");
    let text = excerpt(&transcript, code, 400);
    assert!(!text.contains("SECRETVALUE0001"), "{text}");
    assert!(!text.contains(code), "{text}");
    assert!(text.contains("rejected"), "{text}");
}

#[test]
fn write_credential_is_readable_by_the_oauth_reader() {
    let dir = tempfile::tempdir().unwrap();
    write_credential(dir.path(), "sk-ant-oat01-testtoken").unwrap();
    let provider = crate::oauth::OAuthProvider::new(dir.path().to_str().unwrap());
    assert_eq!(provider.get_token().unwrap(), "sk-ant-oat01-testtoken");
}

#[test]
fn ensure_writable_dir_creates_missing_directories() {
    let dir = tempfile::tempdir().unwrap();
    let nested = dir.path().join("a/b/claude");
    ensure_writable_dir(&nested).unwrap();
    assert!(nested.is_dir());
}

#[test]
fn disabled_manager_refuses_to_begin() {
    let manager = LoginManager::new(LoginConfig {
        enabled: false,
        ..LoginConfig::default()
    });
    let result = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(manager.begin());
    assert!(matches!(result, Err(LoginError::Disabled)));
}
