/// GitHub import copies the exact credential from the explicitly named `gh`
/// home into Router's durable credential store.
#[test]
fn github_import_adopts_the_named_login() {
    let source = tempfile::tempdir().expect("gh config");
    let data = tempfile::tempdir().expect("router data");
    std::fs::write(
        source.path().join("hosts.yml"),
        "github.com:\n    oauth_token: gho_imported\n",
    )
    .expect("gh credential");

    import_github(data.path(), source.path().to_str().unwrap()).expect("GitHub import");

    assert_eq!(
        link_assistant_router::github_proxy::stored_credential(data.path()).as_deref(),
        Some("gho_imported")
    );
}

/// A named `gh` home without a token fails closed and names the source rather
/// than silently falling back to another machine credential.
#[test]
fn github_import_refuses_a_named_home_without_a_login() {
    let source = tempfile::tempdir().expect("empty gh config");
    let data = tempfile::tempdir().expect("router data");

    let error = import_github(data.path(), source.path().to_str().unwrap())
        .expect_err("an absent GitHub login must not import");

    assert!(error.contains("no GitHub credential"), "{error}");
    assert!(
        error.contains(&source.path().display().to_string()),
        "{error}"
    );
    assert!(link_assistant_router::github_proxy::stored_credential(data.path()).is_none());
}

/// Lexically different paths can still name the same credential home. That
/// must be detected before a rotating refresh link is spent.
#[cfg(unix)]
#[test]
fn a_symlink_alias_is_the_same_credential_home() {
    let root = tempfile::tempdir().expect("root");
    let destination = root.path().join("destination");
    let alias = root.path().join("alias");
    std::fs::create_dir(&destination).expect("destination");
    std::os::unix::fs::symlink(&destination, &alias).expect("source alias");

    assert!(same_credential_home(&alias, &destination));
}

/// Once refresh succeeds, failure to obtain a positive catalog verdict keeps
/// the fresh candidate durable without changing the serving destination.
#[tokio::test]
async fn an_unverified_catalog_retains_the_fresh_chain_for_every_provider() {
    for provider in SubscriptionProvider::ALL {
        let (url, requests, server) = start_candidate_vendor(provider, false, true).await;
        let root = tempfile::tempdir().expect("import root");
        let destination_home = root.path().join("destination");
        std::fs::create_dir_all(&destination_home).expect("destination home");
        let destination_path = destination_home.join(provider.canonical_credential_filename());
        let current = candidate_document(provider).replace("stale-", "current-");
        std::fs::write(&destination_path, &current).expect("current destination");

        let error = validate_candidate_with(
            root.path(),
            provider,
            &candidate_document(provider),
            Some(&format!("{url}/token")),
            Some(&url),
        )
        .await
        .expect_err("unverified catalog must fail closed");

        assert_eq!(error.outcome, ImportOutcome::SuccessorRetained);
        assert_eq!(error.phase, ImportPhase::Catalog);
        assert!(!error.previous_credential_safe);
        assert!(error.transaction_id.is_some());
        assert!(
            error.contains("retained as transaction"),
            "{provider}: {error}"
        );
        assert_eq!(
            std::fs::read_to_string(&destination_path).unwrap(),
            current,
            "{provider} destination changed"
        );
        let transactions = std::fs::read_dir(root.path().join("auth-import-candidates"))
            .expect("retained staging root")
            .collect::<Result<Vec<_>, _>>()
            .expect("retained transactions");
        assert_eq!(transactions.len(), 1, "{provider}: {error}");
        let retained = transactions[0]
            .path()
            .join(provider.as_str())
            .join(provider.canonical_credential_filename());
        let retained = std::fs::read_to_string(retained).expect("retained candidate document");
        assert!(
            retained.contains("fresh-access") && retained.contains("fresh-refresh"),
            "{provider} retained stale candidate: {retained}"
        );
        let seen = requests.lock().expect("candidate requests");
        assert_eq!(seen.len(), 2, "{provider}: {seen:?}");
        assert_eq!(seen[0].0, "POST");
        assert_eq!(seen[1].0, "GET");
        drop(seen);
        server.abort();
    }
}

/// No import mode may install a credential the vendor did not positively
/// accept. In particular, conditional provisioning has no force escape hatch
/// that can turn a rejected candidate into a live deployment credential.
#[tokio::test]
async fn rejected_conditional_candidate_has_no_bypass() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, home.path());
    let document = r#"{"access_token":"rejected","refresh_token":"r","scope":"openid"}"#;

    let error = install_candidate(
        &reader,
        data.path(),
        document,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: true,
            capability_asserted: false,
            router_owned_candidate: false,
        },
    )
    .await
    .expect_err("rejected candidate must be refused");

    assert!(error.contains("not accepted"), "{error}");
    assert!(!error.contains("--force"), "{error}");
    assert!(!home.path().join("oauth_creds.json").exists());
}

/// Candidate rejection is relevant only when installation would occur. A
/// destination discovered under the lock remains a distinct successful
/// `AlreadyPresent` result even without force.
#[tokio::test]
async fn rejected_candidate_without_force_reports_existing_destination_as_present() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, home.path());
    let existing = home.path().join("auth.json");
    let current =
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"current","refresh_token":"rotated"}}"#;
    std::fs::write(&existing, current).expect("current credential");

    let outcome = install_candidate(
        &reader,
        data.path(),
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"rejected","refresh_token":"stale"}}"#,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: true,
            capability_asserted: false,
            router_owned_candidate: false,
        },
    )
    .await
    .expect("existing destination wins before rejection policy");

    assert_eq!(
        outcome,
        InstallDocumentResult::AlreadyPresent(existing.clone())
    );
    assert_eq!(std::fs::read_to_string(existing).unwrap(), current);
}
