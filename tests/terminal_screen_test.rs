//! A repaint can contain a complete exact model on screen without writing it contiguously.
#![cfg(unix)]
use link_assistant_router::login_pty::PtySession;
use portable_pty::CommandBuilder;
use std::time::Duration;

#[test]
fn cursor_repaint_preserves_the_exact_model_and_removes_stale_text() {
    let mut command = CommandBuilder::new("sh");
    // Paint a partial row, move back to replace its suffix, then clear stale rows.
    command.args(["-c", r"printf 'Select model\r\nfuture-claude-xxxxx\033[2;15Hnative\r\nobsolete\033[3;1H\033[2K'; sleep 1"]);
    let session = PtySession::spawn(command).unwrap();
    let screen = session
        .wait_for_screen(
            |text| text.contains("future-claude-native"),
            Duration::from_millis(50),
            Duration::from_secs(3),
        )
        .unwrap();
    assert!(screen.contains("Select model"));
    assert!(!screen.contains("obsolete"));
    assert!(!session.transcript().contains("future-claude-native"));
}
