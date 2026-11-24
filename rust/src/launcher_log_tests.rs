//! Bounded retention, credential safety, and scoped output regressions.

use super::*;

#[test]
fn rotation_is_bounded_and_keeps_the_latest_failure() {
    let directory = tempfile::tempdir().unwrap();
    let log = DiagnosticLog::open(directory.path(), false).unwrap();
    for number in 0..8 {
        let path = log.directory.join("launcher.log");
        let file = private_file(&path).unwrap();
        file.set_len(MAX_BYTES).unwrap();
        log.record("fixture", &format!("record {number}"));
        log.check().unwrap();
    }
    log.record("launch_failed", "newest connection failure");
    let files = fs::read_dir(&log.directory)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .collect::<Vec<_>>();
    assert_eq!(
        files.len(),
        ARCHIVES + 2,
        "five archives, current log and lock"
    );
    assert!(
        files
            .iter()
            .all(|path| fs::metadata(path).unwrap().len() <= MAX_BYTES)
    );
    let current = fs::read_to_string(log.directory.join("launcher.log")).unwrap();
    assert!(current.contains("newest connection failure"));
    assert!(!log.directory.join("launcher.log.6").exists());
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        assert!(
            files
                .iter()
                .all(|path| fs::metadata(path).unwrap().permissions().mode() & 0o777 == 0o600)
        );
    }
}

#[test]
fn concurrent_launches_append_whole_records_under_one_lock() {
    let directory = tempfile::tempdir().unwrap();
    let threads = (0..4)
        .map(|worker| {
            let root = directory.path().to_path_buf();
            std::thread::spawn(move || {
                let log = DiagnosticLog::open(&root, false).unwrap();
                for record in 0..20 {
                    log.record("fixture", &format!("worker {worker} record {record}"));
                }
                log.check().unwrap();
            })
        })
        .collect::<Vec<_>>();
    for thread in threads {
        thread.join().unwrap();
    }
    let text = fs::read_to_string(directory.path().join("launcher/launcher.log")).unwrap();
    assert_eq!(text.lines().count(), 80);
    let ids = text
        .lines()
        .map(|line| {
            serde_json::from_str::<serde_json::Value>(line).unwrap()["launch_id"]
                .as_str()
                .unwrap()
                .to_string()
        })
        .collect::<std::collections::HashSet<_>>();
    assert_eq!(ids.len(), 4);
}

#[tokio::test]
async fn unavailable_log_prevents_polling_prelaunch_work_and_has_an_inspectable_error() {
    let directory = tempfile::tempdir().unwrap();
    fs::create_dir_all(directory.path().join("launcher/launcher.log")).unwrap();
    let context = crate::operation_context::OperationContext::isolated(directory.path());
    let cli = crate::cli::try_parse_arguments(
        ["router", "with", "claude"]
            .into_iter()
            .map(Into::into)
            .collect(),
    )
    .unwrap();
    let Some(crate::cli::Command::With(args)) = cli.command else {
        panic!("Claude arguments")
    };
    context
        .scope_async(async {
            let code = run(&args, Some(directory.path()), false, async {
                panic!("prelaunch work must not run without a writable log");
            })
            .await;
            assert_eq!(code, ExitCode::from(1));
        })
        .await;
    assert!(
        context
            .output
            .lock()
            .unwrap()
            .stderr
            .contains("could not open launcher log")
    );
}

#[test]
fn credentials_in_structured_and_free_text_diagnostics_are_redacted() {
    let text = concat!(
        "failure {\"access_token\":\"oauth-value\",\"refreshToken\":\"refresh-value\",",
        "\"Cookie\":\"session=cookie-value\",\"apiKey\":\"key-value\"}\n",
        "Authorization: Bearer bearer-value\nCookie: a=cookie-one; b=cookie-two\n",
        "https://name:password@example.test/path?%61ccess_token=query-value&model=glm\n",
        "http://name:second-password@example.test/path\n",
        "sk-ant-oat01-anthropic-secret-value and la_sk_header.payload.signature\n",
        "raw JWT eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZWNyZXQifQ.signature\n",
        "known=arbitrary-secret-value",
        "\nUnicode é failure {\"token\":{\"value\":\"nested-secret\"},\"oauth_token\":[\"array-secret\"]}",
    );
    let safe = redaction::sanitize(text, &["arbitrary-secret-value".into()]);
    for secret in [
        "oauth-value",
        "refresh-value",
        "cookie-value",
        "key-value",
        "bearer-value",
        "cookie-one",
        "cookie-two",
        "password",
        "query-value",
        "anthropic-secret-value",
        "payload.signature",
        "eyJzdWIiOiJzZWNyZXQifQ",
        "arbitrary-secret-value",
        "nested-secret",
        "array-secret",
    ] {
        assert!(!safe.contains(secret), "leaked {secret}: {safe}");
    }
    assert!(safe.contains("model=glm"), "{safe}");
    assert!(safe.contains("failure"), "{safe}");
    let model =
        r#"model context {"selected":{"id":"glm-5.3"},"unavailable":["billing exhausted"]}"#;
    assert_eq!(redaction::sanitize(model, &[]), model);
}

#[tokio::test]
async fn scoped_logging_keeps_structured_diagnostics_and_records_write_failure() {
    let directory = tempfile::tempdir().unwrap();
    let context = crate::operation_context::OperationContext::isolated(directory.path());
    context
        .scope_async(async {
            let log = DiagnosticLog::open(directory.path(), false).unwrap();
            ACTIVE
                .scope(log.clone(), async {
                    eprintln!("an inspectable structured failure");
                    assert!(
                        context
                            .output
                            .lock()
                            .unwrap()
                            .stderr
                            .contains("inspectable")
                    );
                    // A write failure cannot leave the launcher reporting success.
                    fs::remove_file(log.directory.join("launcher.log")).unwrap();
                    fs::create_dir(log.directory.join("launcher.log")).unwrap();
                    record("failure", "cannot persist");
                    assert!(check().is_err());
                })
                .await;
        })
        .await;
}

#[cfg(unix)]
#[test]
fn symlink_destinations_are_refused_without_modifying_the_target() {
    let directory = tempfile::tempdir().unwrap();
    let target = directory.path().join("user-file");
    fs::write(&target, "user-owned").unwrap();
    fs::create_dir(directory.path().join("launcher")).unwrap();
    std::os::unix::fs::symlink(&target, directory.path().join("launcher/launcher.log")).unwrap();
    assert!(DiagnosticLog::open(directory.path(), false).is_err());
    assert_eq!(fs::read_to_string(target).unwrap(), "user-owned");
}
