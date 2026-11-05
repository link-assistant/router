//! Independent native profile-session oracle. SOURCE ONLY; UNRUN. Gated CI only.
use link_assistant_router::{translation_core, durable_file};
#[path = "../src/claude_profile.rs"]
mod actual_native_profile;
#[tokio::test]
async fn concurrent_native_profiles_keep_independent_markers_and_persistent_sessions() {
    let root = tempfile::tempdir().expect("isolated profile");
    let profile = root.path().join("clients/claude/home");
    let first = actual_native_profile::ProfileSession::prepare(profile.clone(), false).await.expect("first session");
    std::fs::write(profile.join("session.jsonl"), b"retain session").expect("session");
    let second = actual_native_profile::ProfileSession::prepare(profile.clone(), false).await.expect("second session");
    let active = profile.parent().expect("parent").join("active");
    assert_eq!(std::fs::read_dir(&active).expect("active markers").count(), 2);
    first.commit_launch(std::process::id()).expect("actual process marker");
    drop(first);
    assert_eq!(std::fs::read_dir(&active).expect("second marker").count(), 1);
    drop(second);
    assert_eq!(std::fs::read_dir(&active).expect("released markers").count(), 0);
    assert_eq!(std::fs::read(profile.join("session.jsonl")).expect("persistent session"), b"retain session");
}
