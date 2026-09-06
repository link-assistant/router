use super::*;

/// An unverified candidate is not a live credential. A timeout, malformed
/// catalog response, or network failure must therefore leave even an empty
/// conditional destination empty.
#[tokio::test]
async fn conditional_import_refuses_an_unverified_candidate() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Gemini, home.path());
    let error = install_candidate(
        &reader,
        data.path(),
        r#"{"access_token":"unverified","refresh_token":"unknown"}"#,
        CredentialProbe::Unverified,
        ImportPolicy {
            if_absent: true,
            capability_asserted: false,
            router_owned_candidate: false,
        },
    )
    .await
    .expect_err("unverified candidate must be refused");

    assert!(error.contains("not accepted"), "{error}");
    assert!(!home.path().join("oauth_creds.json").exists());
}

/// The positive capability assertion is not a bypass: rejection still wins.
#[tokio::test]
async fn capability_assertion_cannot_install_a_rejected_candidate() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, home.path());
    let candidate = r#"{"auth_mode":"chatgpt","tokens":{"access_token":"rejected","refresh_token":"explicit"}}"#;

    let error = install_candidate(
        &reader,
        data.path(),
        candidate,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: true,
            capability_asserted: true,
            router_owned_candidate: false,
        },
    )
    .await
    .expect_err("capability assertion must not bypass positive vendor acceptance");

    let destination = home.path().join("auth.json");
    assert!(error.contains("not accepted"), "{error}");
    assert!(!destination.exists());
}

/// Replacement is allowed only for a positively accepted candidate. A stale
/// or revoked local copy must never replace a working rotating chain.
#[tokio::test]
async fn ordinary_import_preserves_the_destination_when_candidate_is_rejected() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Gemini, home.path());
    let current = r#"{"access_token":"current","refresh_token":"rotated"}"#;
    std::fs::write(home.path().join("oauth_creds.json"), current).expect("current credential");
    let error = install_candidate(
        &reader,
        data.path(),
        r#"{"access_token":"rejected","scope":"preserved"}"#,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: false,
            capability_asserted: false,
            router_owned_candidate: false,
        },
    )
    .await
    .expect_err("replacement must require positive vendor acceptance");

    assert!(error.contains("not accepted"), "{error}");
    assert_eq!(
        std::fs::read_to_string(home.path().join("oauth_creds.json")).unwrap(),
        current
    );
}

/// The same positive-acceptance gate applies to every subscription provider
/// and to both installation modes (issue #385).
#[tokio::test]
async fn rejected_and_unverified_candidates_never_change_any_provider_destination() {
    for provider in SubscriptionProvider::ALL {
        for if_absent in [false, true] {
            for probe in [CredentialProbe::Rejected, CredentialProbe::Unverified] {
                let root = tempfile::tempdir().expect("credential root");
                let home = root.path().join("home");
                let data = root.path().join("data");
                std::fs::create_dir_all(&home).expect("credential home");
                let reader = SubscriptionReader::new(provider, &home);
                let path = home.join(provider.canonical_credential_filename());
                let current = b"existing credential bytes";
                if !if_absent {
                    std::fs::write(&path, current).expect("existing credential");
                }

                let result = install_candidate(
                    &reader,
                    &data,
                    r#"{"access_token":"candidate","refresh_token":"candidate-refresh"}"#,
                    probe,
                    ImportPolicy {
                        if_absent,
                        capability_asserted: false,
                        router_owned_candidate: false,
                    },
                )
                .await;

                assert!(
                    result.is_err(),
                    "{provider} if_absent={if_absent} {probe:?}"
                );
                if if_absent {
                    assert!(!path.exists(), "{provider} installed {probe:?}");
                } else {
                    assert_eq!(
                        std::fs::read(&path).unwrap(),
                        current,
                        "{provider} replaced destination after {probe:?}"
                    );
                }
            }
        }
    }
}
