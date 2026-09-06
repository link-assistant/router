//! Black-box safety boundaries for external credential import.

use std::process::Command;

#[test]
fn gemini_external_import_rejects_an_unverified_chain_without_staging_the_source() {
    let root = tempfile::tempdir().expect("root");
    let source = root.path().join("source");
    let destination = root.path().join("destination");
    let data = root.path().join("data");
    std::fs::create_dir(&source).expect("source");
    std::fs::write(
        source.join("oauth_creds.json"),
        r#"{"access_token":"candidate","refresh_token":"refresh","expiry_date":9999999999999}"#,
    )
    .expect("candidate");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "import",
            "gemini",
            source.to_str().expect("source path"),
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-import-safety-test")
        .env("HOME", root.path())
        .env("GEMINI_HOME", &destination)
        .env("DATA_DIR", &data)
        .env_remove("GEMINI_OAUTH_CLIENT_SECRET")
        .output()
        .expect("router CLI");

    assert!(!output.status.success(), "{output:?}");
    let error = String::from_utf8_lossy(&output.stderr);
    assert!(
        error.contains("gemini candidate refresh chain")
            && (error.contains("was not verified") || error.contains("was rejected")),
        "{error}"
    );
    assert!(!error.contains("GEMINI_OAUTH_CLIENT_SECRET"), "{error}");
    let candidates = data.join("auth-import-candidates");
    assert!(
        !candidates.exists() || candidates.read_dir().unwrap().next().is_none(),
        "external validation retained a successor transaction"
    );
    assert!(!destination.join("oauth_creds.json").exists());
}

#[cfg(unix)]
#[test]
fn a_symlink_source_cannot_spend_the_destination_chain() {
    let root = tempfile::tempdir().expect("root");
    let destination = root.path().join("destination");
    let source_alias = root.path().join("source-alias");
    let data = root.path().join("data");
    std::fs::create_dir(&destination).expect("destination");
    let current = br#"{"access_token":"current","refresh_token":"current-refresh","resource_url":"portal.qwen.ai"}"#;
    std::fs::write(destination.join("oauth_creds.json"), current).expect("credential");
    std::os::unix::fs::symlink(&destination, &source_alias).expect("source alias");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "auth",
            "import",
            "qwen",
            source_alias.to_str().expect("source path"),
            "--if-absent",
            "--local",
        ])
        .env("TOKEN_SECRET", "auth-import-safety-test")
        .env("HOME", root.path())
        .env("QWEN_HOME", &destination)
        .env("DATA_DIR", &data)
        .output()
        .expect("router CLI");

    assert!(!output.status.success(), "{output:?}");
    assert!(
        String::from_utf8_lossy(&output.stderr).contains("already read from"),
        "{output:?}"
    );
    assert_eq!(
        std::fs::read(destination.join("oauth_creds.json")).unwrap(),
        current
    );
    assert!(!data.join("auth-import-candidates").exists());
}
