//! Independent native mixed-session/reset lock oracle. SOURCE ONLY; UNRUN. CI only.
use link_assistant_router::{client_lifecycle, cli::{ClientSelection, ProfileSelection}, clients::ClientKind};
#[test]
fn reset_cannot_move_settings_while_session_registration_owns_the_same_advisory_lock() {
    let home = tempfile::tempdir().expect("isolated home");
    let state = home.path().join(".config/link-assistant-router/clients/claude");
    let profile = state.join("home");
    std::fs::create_dir_all(&profile).expect("profile");
    let settings = profile.join("settings.json");
    let original = br#"{"model":"exact"}"#;
    std::fs::write(&settings, original).expect("settings");
    let held = std::fs::OpenOptions::new().read(true).write(true).create(true).truncate(false).open(state.join("profile-operation.lock")).expect("shared session lock");
    held.try_lock().expect("session registering");
    let selection = ClientSelection { client: Some(ClientKind::ClaudeCode), all: false, profile: ProfileSelection::Router };
    let result = client_lifecycle::reset::run(Some(home.path()), &selection, false, false, true, true);
    assert_eq!(result, std::process::ExitCode::FAILURE);
    assert_eq!(std::fs::read(&settings).expect("settings retained"), original);
    assert!(!std::fs::read_dir(&profile).expect("profile").any(|entry| entry.expect("entry").file_name().to_string_lossy().starts_with(".router-reset-")));
    drop(held);
}
