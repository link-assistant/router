use super::*;

#[test]
fn vendor_gated_clients_fail_before_minting_tokens_or_writing_configs() {
    for (client, expected) in [
        ("cursor", "speaks Connect-RPC"),
        ("gemini-cli", "IneligibleTierError"),
    ] {
        let home = tempfile::tempdir().expect("temp home");
        let setup = router(home.path(), &["clients", "setup", client]);
        assert!(!setup.status.success());
        assert!(String::from_utf8_lossy(&setup.stderr).contains(expected));
        assert!(!home.path().join("router-data/tokens.json").exists());
        let doctor = router(home.path(), &["clients", "doctor", client]);
        assert!(!doctor.status.success());
        assert!(String::from_utf8_lossy(&doctor.stderr).contains(expected));
    }
}

#[test]
fn qwen_setup_remains_compatible_with_legacy_wrapped_models() {
    let home = tempfile::tempdir().expect("temp home");
    let qwen_dir = home.path().join(".qwen");
    fs::create_dir_all(&qwen_dir).expect("create qwen dir");
    fs::write(
        qwen_dir.join("settings.json"),
        r#"{"modelProviders":{"openai":{"models":[{"id":"mine"}]}}}"#,
    )
    .expect("seed legacy settings");
    let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
    let token = test_token("qwen");
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "qwen-code",
            "--token",
            &token,
            "--base-url",
            &base_url,
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    let document: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(qwen_dir.join("settings.json")).expect("read settings"),
    )
    .expect("valid JSON");
    let models = document["modelProviders"]["openai"]["models"]
        .as_array()
        .expect("legacy models remain wrapped");
    assert_eq!(models.len(), 2);
    assert_eq!(models[0]["id"], "mine");
    assert_eq!(server.join().expect("catalog server").len(), 1);
}

#[test]
fn opencode_remove_restores_a_provider_that_setup_replaced() {
    let home = tempfile::tempdir().expect("temp home");
    let directory = home.path().join(".config/opencode");
    fs::create_dir_all(&directory).expect("create config dir");
    let path = directory.join("opencode.json");
    fs::write(
        &path,
        r#"{"provider":{"link-assistant":{"name":"User-owned"}}}"#,
    )
    .expect("seed provider");
    let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
    let token = test_token("opencode");
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token",
            &token,
            "--base-url",
            &base_url,
        ],
    );
    assert!(setup.status.success());
    assert_eq!(server.join().expect("catalog server").len(), 1);
    let removed = router(home.path(), &["clients", "remove", "opencode"]);
    assert!(removed.status.success());
    let document: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(path).expect("read restored config"))
            .expect("valid JSON");
    assert_eq!(document["provider"]["link-assistant"]["name"], "User-owned");
}

#[test]
fn reconfiguration_updates_owned_entries_so_remove_stays_surgical() {
    for client in ["opencode", "qwen-code"] {
        let home = tempfile::tempdir().expect("temp home");
        for _ in 0..2 {
            let (base_url, server) = catalog_server(&[("gpt-live", "openai")]);
            let token = test_token(client);
            let setup = router(
                home.path(),
                &[
                    "clients",
                    "setup",
                    client,
                    "--token",
                    &token,
                    "--base-url",
                    &base_url,
                ],
            );
            assert!(setup.status.success());
            assert_eq!(server.join().expect("catalog server").len(), 1);
        }
        assert!(
            router(home.path(), &["clients", "remove", client])
                .status
                .success()
        );
        let shown = router(home.path(), &["clients", "show", client]);
        assert!(shown.status.success());
        assert!(String::from_utf8_lossy(&shown.stdout).contains("\"configured\": false"));
    }
}
