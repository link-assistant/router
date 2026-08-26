//! Unit tests for [`crate::github_proxy`].
//!
//! Split from `github_proxy.rs` to keep that file within the repository's
//! 1000-line limit.

use super::*;
use axum::http::Request as HttpRequest;
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

#[test]
fn enterprise_and_bare_paths_normalize_to_github_rest() {
    assert!(GitHubProxyConfig::with_credential("operator", "https://example.test").enabled());
    assert_eq!(normalize_path("/api/v3/rate_limit"), "/rate_limit");
    assert_eq!(normalize_path("/repos/o/r"), "/repos/o/r");
    assert_eq!(normalize_path("/api/graphql"), "/graphql");
    assert_eq!(
        upstream_url("https://github.example/api/v3", "/graphql"),
        "https://github.example/api/graphql"
    );
}

#[test]
fn default_policy_blocks_each_destructive_class() {
    let policy = GitHubPolicy::default();
    for path in [
        "/repos/o/r",
        "/repos/o/r/git/refs/heads/main",
        "/repos/o/r/git/refs/tags/v1",
        "/repos/o/r/releases/1",
        "/repos/o/r/issues/1",
        "/repos/o/r/issues/comments/1",
        "/repos/o/r/actions/workflows/ci.yml",
        "/orgs/o/packages/container/p/versions/1",
        "/repos/o/r/deploy-keys/1",
        "/repos/o/r/hooks/1",
    ] {
        assert_eq!(
            policy.decision("DELETE", path, b""),
            PolicyDecision::Deny,
            "DELETE {path} must be blocked by default"
        );
    }
    assert_eq!(
        policy.decision(
            "PATCH",
            "/repos/o/r/git/refs/heads/main",
            br#"{"force":true}"#
        ),
        PolicyDecision::Deny
    );
    assert_eq!(
        policy.decision(
            "POST",
            "/graphql",
            br#"{"query":"mutation { deleteIssue(input:{}) { clientMutationId } }"}"#
        ),
        PolicyDecision::Deny
    );
    assert_eq!(
        policy.decision(
            "PATCH",
            "/repos/o/r/git/refs/heads/main",
            br#"{"force":false}"#
        ),
        PolicyDecision::Allow
    );
    assert_eq!(
        policy.decision(
            "POST",
            "/graphql",
            br#"{"query":"mutation($input:UpdateRefInput!){updateRef(input:$input){clientMutationId}}","variables":{"input":{"force":true}}}"#
        ),
        PolicyDecision::Deny
    );
    assert_eq!(
        policy.decision(
            "POST",
            "/graphql",
            br##"{"query":"# a harmless preface\nfragment F on Repository { name }\nmutation Remove { deleteRelease(input:{releaseId:\"x\"}) { clientMutationId } }"}"##
        ),
        PolicyDecision::Deny
    );
    assert_eq!(
        policy.decision(
            "POST",
            "/graphql",
            br#"{"query":"mutation($updates:[RefUpdate!]!){updateRefs(input:{repositoryId:\"r\",refUpdates:$updates}){clientMutationId}}","variables":{"updates":[{"name":"refs/heads/main","afterOid":"0000000000000000000000000000000000000000"}]}}"#
        ),
        PolicyDecision::Deny
    );
    assert_eq!(
        policy.decision(
            "POST",
            "/graphql",
            br#"{"query":"mutation { updateRefs(input:{repositoryId:\"r\",refUpdates:[{name:\"refs/heads/main\",afterOid:\"0000000000000000000000000000000000000000\"}]}) { clientMutationId } }"}"#
        ),
        PolicyDecision::Deny
    );
}

/// Destructive operations that do not spell their intent in the method.
///
/// The policy keyed on the verb, so `DELETE .../protection` was denied while
/// the `PUT` beside it — which replaces the whole protection object and
/// reaches the same end state — was allowed. Branch protection is the control
/// an agent is not supposed to talk past, so a routed token able to rewrite it
/// put the backstop inside the blast radius of what it backstops (issue #329).
#[test]
fn destructive_effects_are_denied_whatever_verb_carries_them() {
    let policy = GitHubPolicy::default();
    for (method, path, body) in [
        // Replaces the protection object wholesale; the body below reaches the
        // same end state as the DELETE that is already refused.
        (
            "PUT",
            "/repos/o/r/branches/main/protection",
            &br#"{"allow_force_pushes":true,"allow_deletions":true,"enforce_admins":false}"#[..],
        ),
        (
            "PUT",
            "/repos/o/r/branches/main/protection/required_signatures",
            b"",
        ),
        // Relaxes the ruleset the protection above depends on.
        ("PUT", "/repos/o/r/rulesets/1", b"{}"),
        // Moves the repository to another owner: strictly worse for the org
        // than the denied DELETE of it.
        ("POST", "/repos/o/r/transfer", br#"{"new_owner":"someone"}"#),
        // Publishes a private repository — exfiltration with no exfiltration.
        ("PATCH", "/repos/o/r", br#"{"visibility":"public"}"#),
        ("PATCH", "/repos/o/r", br#"{"private":false}"#),
        ("PATCH", "/repos/o/r", br#"{"archived":true}"#),
        ("PATCH", "/repos/o/r", br#"{"default_branch":"other"}"#),
    ] {
        assert_eq!(
            policy.decision(method, path, body),
            PolicyDecision::Deny,
            "{method} {path} must be blocked by default"
        );
    }

    // Keyed on the effect, not the path: an ordinary edit stays allowed, or
    // the deny list would stop being a policy and start being an outage.
    for (method, path, body) in [
        (
            "PATCH",
            "/repos/o/r",
            &br#"{"description":"a library"}"#[..],
        ),
        (
            "PATCH",
            "/repos/o/r",
            br#"{"homepage":"https://example.com"}"#,
        ),
        ("GET", "/repos/o/r/branches/main/protection", b""),
        ("POST", "/repos/o/r/issues", br#"{"title":"bug"}"#),
        // A different resource that merely shares the verb.
        ("PUT", "/repos/o/r/contents/README.md", b"{}"),
    ] {
        assert_eq!(
            policy.decision(method, path, body),
            PolicyDecision::Allow,
            "{method} {path} is not destructive and must not be blocked"
        );
    }
}

/// The escape hatch works for these exactly as it does for every other denial.
///
/// An operator who genuinely wants a task to flip a repository's visibility
/// writes one allow rule for that one path, and the remaining defaults keep
/// applying — the shape `allows_git_ref` already established.
#[test]
fn an_operator_can_permit_one_destructive_effect() {
    let policy: GitHubPolicy = serde_json::from_value(json!({"rules": [{
        "effect": "allow", "method": "POST", "path": "/repos/o/r/transfer"
    }]}))
    .unwrap();
    assert_eq!(
        policy.decision("POST", "/repos/o/r/transfer", b"{}"),
        PolicyDecision::Allow
    );
    assert_eq!(
        policy.decision("POST", "/repos/other/repo/transfer", b"{}"),
        PolicyDecision::Deny,
        "permitting one repository must not permit the rest"
    );
    assert_eq!(
        policy.decision("PUT", "/repos/o/r/branches/main/protection", b"{}"),
        PolicyDecision::Deny,
        "one permission must not weaken the other defaults"
    );
}

/// The REST and GraphQL halves agree about what is destructive.
///
/// They are two spellings of one API, so a denial that depends on which one a
/// caller reached for is a routing question rather than a policy (issue #329).
#[test]
fn the_graphql_surface_denies_the_same_effects() {
    let policy = GitHubPolicy::default();
    for query in [
        "mutation { transferRepository(input: {repositoryId: \"1\", newOwnerId: \"2\"}) { repository { name } } }",
        "mutation { updateRepository(input: {repositoryId: \"1\", visibility: PUBLIC}) { repository { name } } }",
        "mutation { updateBranchProtectionRule(input: {branchProtectionRuleId: \"1\", allowsForcePushes: true}) { clientMutationId } }",
        "mutation { updateRepositoryRuleset(input: {rulesetId: \"1\"}) { clientMutationId } }",
        "mutation { updateOrganizationRuleset(input: {rulesetId: \"1\"}) { clientMutationId } }",
    ] {
        assert_eq!(
            policy.decision(
                "POST",
                "/graphql",
                json!({"query": query}).to_string().as_bytes()
            ),
            PolicyDecision::Deny,
            "the GraphQL spelling must be denied too: {query}"
        );
    }
    // A read is still a read.
    assert_eq!(
        policy.decision(
            "POST",
            "/graphql",
            json!({"query": "query { repository(owner: \"o\", name: \"r\") { name } }"})
                .to_string()
                .as_bytes()
        ),
        PolicyDecision::Allow
    );
}

#[test]
fn policy_rejects_misspelled_configuration_fields() {
    let error = serde_json::from_value::<GitHubPolicy>(json!({
        "rules": [{"effect":"deny", "path":"/**", "methd":"POST"}]
    }))
    .unwrap_err();
    assert!(error.to_string().contains("unknown field `methd`"));
}

#[test]
fn explicit_allow_overrides_one_default_without_weakening_others() {
    let policy: GitHubPolicy = serde_json::from_value(json!({"rules": [{
        "effect": "allow", "method": "DELETE", "path": "/repos/o/r/issues/*"
    }]}))
    .unwrap();
    assert_eq!(
        policy.decision("DELETE", "/repos/o/r/issues/1", b""),
        PolicyDecision::Allow
    );
    assert_eq!(
        policy.decision("DELETE", "/repos/o/r/releases/1", b""),
        PolicyDecision::Deny
    );
}

#[tokio::test]
async fn forwarding_contains_credentials_and_preserves_rate_limits() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut request = vec![0_u8; 8 * 1024];
        let read = socket.read(&mut request).await.unwrap();
        socket
            .write_all(
                b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\nx-ratelimit-remaining: 42\r\nset-cookie: upstream=secret\r\ncontent-length: 11\r\n\r\n{\"ok\":true}",
            )
            .await
            .unwrap();
        String::from_utf8_lossy(&request[..read]).to_string()
    });
    let config =
        GitHubProxyConfig::with_credential("operator-secret", &format!("http://{address}"));
    let request = HttpRequest::builder()
        .uri("/api/v3/rate_limit")
        .header("authorization", "Bearer caller-placeholder")
        .body(Body::empty())
        .unwrap();

    let response = forward(
        &reqwest::Client::new(),
        &config,
        crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        &[],
        request,
    )
    .await;
    let forwarded = server.await.unwrap().to_ascii_lowercase();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["x-ratelimit-remaining"], "42");
    assert!(!response.headers().contains_key("set-cookie"));
    assert!(forwarded.contains("authorization: bearer operator-secret"));
    assert!(!forwarded.contains("caller-placeholder"));
}

/// A scoped token reaches only its own repositories.
///
/// Without this, every token that could reach the proxy acted as the
/// operator across their whole account, so one task going wrong had the
/// account as its blast radius rather than the one repository it was
/// given (issue #262).
#[test]
fn a_scoped_token_names_only_its_own_repositories() {
    assert_eq!(
        repository_in_path("/repos/link-assistant/hive-mind/issues"),
        Some("link-assistant/hive-mind".to_string())
    );
    assert_eq!(
        repository_in_path("/repos/acme/demo"),
        Some("acme/demo".to_string())
    );
    // Not repository-shaped: left to the policy rules rather than guessed at.
    assert_eq!(repository_in_path("/user"), None);
    assert_eq!(repository_in_path("/graphql"), None);
    assert_eq!(repository_in_path("/repos/onlyowner"), None);
    assert_eq!(repository_in_path("/orgs/acme/repos"), None);
}

/// An unrestricted token keeps reaching everything the operator credential
/// reaches, which is the default and the pre-existing behaviour.
#[tokio::test]
async fn an_unrestricted_token_is_not_narrowed() {
    let claims = crate::token::TokenClaims {
        sub: "t".into(),
        iat: 0,
        exp: i64::MAX,
        label: String::new(),
        scope: String::new(),
        github_repos: Vec::new(),
    };

    assert!(claims.may_reach_repository("acme/anything"));
    assert!(claims.may_reach_repository("other/repo"));
}

/// A scope is matched case-insensitively, as GitHub treats these names —
/// otherwise a differently-cased request would evade the restriction.
#[tokio::test]
async fn a_scope_is_case_insensitive_and_exclusive() {
    let claims = crate::token::TokenClaims {
        sub: "t".into(),
        iat: 0,
        exp: i64::MAX,
        label: String::new(),
        scope: String::new(),
        github_repos: vec!["link-assistant/hive-mind".to_string()],
    };

    assert!(claims.may_reach_repository("link-assistant/hive-mind"));
    assert!(claims.may_reach_repository("Link-Assistant/Hive-Mind"));
    assert!(!claims.may_reach_repository("link-assistant/router"));
    assert!(!claims.may_reach_repository("someone-else/hive-mind"));
}

/// The scope is enforced by the proxy, not merely representable.
///
/// A request outside the token's repositories must be refused before the
/// operator credential is attached — the whole point being that the caller
/// never acts as the operator outside its scope (issue #262).
#[tokio::test]
async fn a_request_outside_the_scope_never_reaches_github() {
    let config = GitHubProxyConfig {
        base_url: "http://127.0.0.1:1".to_string(),
        token: Some("operator-secret".to_string()),
        policy: GitHubPolicy::default(),
    };
    let scope = vec!["link-assistant/hive-mind".to_string()];

    let refused = forward(
        &reqwest::Client::new(),
        &config,
        crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        &scope,
        HttpRequest::builder()
            .uri("/api/v3/repos/someone-else/private/issues")
            .body(Body::empty())
            .unwrap(),
    )
    .await;

    assert_eq!(refused.status(), StatusCode::FORBIDDEN);
    assert_eq!(refused.headers()[POLICY_HEADER], "blocked");
    // The upstream is an unroutable port: had the request been forwarded,
    // this would be a transport error rather than a policy refusal.
}

/// A request inside the scope is not refused by the scope check, so the
/// restriction narrows access without breaking the repository it names.
#[tokio::test]
async fn a_request_inside_the_scope_is_not_refused_by_the_scope() {
    let config = GitHubProxyConfig {
        base_url: "http://127.0.0.1:1".to_string(),
        token: Some("operator-secret".to_string()),
        policy: GitHubPolicy::default(),
    };
    let scope = vec!["link-assistant/hive-mind".to_string()];

    let response = forward(
        &reqwest::Client::new(),
        &config,
        crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        &scope,
        HttpRequest::builder()
            .uri("/api/v3/repos/link-assistant/hive-mind/issues")
            .body(Body::empty())
            .unwrap(),
    )
    .await;

    // Reaching the unroutable upstream is a gateway failure, which proves
    // the scope let it through rather than blocking it.
    assert_ne!(response.status(), StatusCode::FORBIDDEN);
}

/// A mounted `gh` login is an existing credential the deployment reuses,
/// rather than a second token to mint and rotate (issue #263).
#[test]
fn a_gh_configuration_yields_its_credential() {
    let directory = tempfile::tempdir().expect("gh config dir");
    std::fs::write(
        directory.path().join("hosts.yml"),
        "github.com:\n    oauth_token: gho_example\n    user: someone\n",
    )
    .expect("write hosts.yml");

    assert_eq!(
        token_from_gh_config(directory.path()),
        Some("gho_example".to_string())
    );
}

/// A quoted value and an absent file are both handled, so a config written
/// by any `gh` version either works or is reported as missing.
#[test]
fn a_quoted_or_absent_credential_is_handled() {
    let directory = tempfile::tempdir().expect("gh config dir");
    assert_eq!(token_from_gh_config(directory.path()), None, "absent file");

    std::fs::write(
        directory.path().join("hosts.yml"),
        "github.com:\n    oauth_token: \"gho_quoted\"\n",
    )
    .expect("write hosts.yml");
    assert_eq!(
        token_from_gh_config(directory.path()),
        Some("gho_quoted".to_string())
    );

    std::fs::write(
        directory.path().join("hosts.yml"),
        "github.com:\n    user: someone\n",
    )
    .expect("rewrite");
    assert_eq!(token_from_gh_config(directory.path()), None, "no token key");
}

/// A stored credential round-trips and is written owner-only, like every
/// other secret this crate persists.
#[test]
fn a_stored_credential_round_trips_owner_only() {
    let data_dir = tempfile::tempdir().expect("data dir");

    assert_eq!(
        stored_credential(data_dir.path()),
        None,
        "nothing stored yet"
    );
    store_credential(data_dir.path(), "  gho_stored\n").expect("store it");
    assert_eq!(
        stored_credential(data_dir.path()),
        Some("gho_stored".to_string()),
        "surrounding whitespace is not part of the credential"
    );

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        let mode = std::fs::metadata(stored_credential_path(data_dir.path()))
            .expect("stat")
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o600, "mode was {:o}", mode & 0o777);
    }
}

/// The git transport base is derived from the API base, so an enterprise
/// or test deployment stays consistent across both surfaces.
#[test]
fn the_git_base_follows_the_api_base() {
    assert_eq!(
        GitHubProxyConfig::with_credential("t", "https://api.github.com").git_base_url(),
        "https://github.com"
    );
    assert_eq!(
        GitHubProxyConfig::with_credential("t", "http://127.0.0.1:9000").git_base_url(),
        "http://127.0.0.1:9000"
    );
}

/// A stored credential is preferred over a mounted `gh` login, and either
/// is used only when no explicit setting supplied one (issue #263).
#[test]
fn a_reusable_credential_prefers_what_the_operator_stored() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let gh_config = tempfile::tempdir().expect("gh config dir");
    std::fs::write(
        gh_config.path().join("hosts.yml"),
        "github.com:\n    oauth_token: gho_from_gh\n",
    )
    .expect("write hosts.yml");

    // Only the gh login exists.
    assert_eq!(
        reusable_credential(Some(data_dir.path()), Some(gh_config.path())),
        Some("gho_from_gh".to_string())
    );

    // Once stored, the operator's own choice wins.
    store_credential(data_dir.path(), "gho_stored").expect("store one");
    assert_eq!(
        reusable_credential(Some(data_dir.path()), Some(gh_config.path())),
        Some("gho_stored".to_string())
    );
}

/// A credential stored through `--data-dir` is found at startup (issue #282).
///
/// `--data-dir` and `DATA_DIR` name one setting and clap merges them, but the
/// proxy re-read `DATA_DIR` itself and so saw only the environment spelling.
/// The flag form left the entire GitHub surface unmounted while `auth gh
/// --status` — which reads the parsed value — reported the credential present.
///
/// `DATA_DIR` is deliberately absent from this test's environment: with it set,
/// the old code passes for the wrong reason.
#[test]
fn a_credential_stored_under_a_flag_data_dir_is_found() {
    let data_dir = tempfile::tempdir().expect("data dir");
    store_credential(data_dir.path(), "gho_stored_by_flag").expect("store one");

    let github = GitHubProxyConfig::from_env_with_data_dir(Some(data_dir.path()))
        .expect("a stored credential loads");

    assert!(
        github.enabled(),
        "a credential stored through --data-dir must mount the GitHub surface"
    );
    assert_eq!(github.credential(), Some("gho_stored_by_flag"));
}

/// With neither source there is nothing to reuse, so the proxy stays
/// disabled rather than starting without a credential.
#[test]
fn without_either_source_there_is_nothing_to_reuse() {
    let empty = tempfile::tempdir().expect("empty dir");

    assert_eq!(reusable_credential(None, None), None);
    assert_eq!(reusable_credential(Some(Path::new("")), None), None);
    assert_eq!(
        reusable_credential(Some(empty.path()), Some(empty.path())),
        None
    );
}

/// `from_env` still resolves the data directory from `DATA_DIR`.
///
/// The parsed-configuration spelling is what production uses (issue #282), but
/// this one remains for callers with no config to hand, and it must keep
/// finding what it always found.
#[test]
fn from_env_still_reads_the_environment_spelling() {
    let data_dir = tempfile::tempdir().expect("data dir");
    store_credential(data_dir.path(), "gho_from_environment").expect("store one");

    assert_eq!(
        reusable_credential(Some(data_dir.path()), None),
        Some("gho_from_environment".to_string()),
        "the same lookup from_env delegates to must still find it"
    );
}

/// A branch name containing a slash is still a branch name.
///
/// `feature/x` is ordinary and legal on GitHub, and matching the branch as one
/// path segment let a `PUT` to its protection through — reopening the hole on
/// the exact control the rest of this policy leans on (issue #329).
#[test]
fn a_slashed_branch_name_does_not_escape_the_protection_deny() {
    let policy = GitHubPolicy::default();
    for path in [
        "/repos/o/r/branches/feature/x/protection",
        "/repos/o/r/branches/release/2026/q1/protection",
        "/repos/o/r/branches/feature/x/protection/required_signatures",
    ] {
        assert_eq!(
            policy.decision("PUT", path, b"{}"),
            PolicyDecision::Deny,
            "PUT {path} must be blocked however many slashes the branch has"
        );
    }
    // Still not a blanket deny on everything under /branches/.
    assert_eq!(
        policy.decision("GET", "/repos/o/r/branches/feature/x/protection", b""),
        PolicyDecision::Allow
    );
}

/// An organisation ruleset governs the repositories under it.
///
/// The same verb asymmetry one level up: `DELETE` was refused while the `PUT`
/// that relaxes the rule to nothing was not, and an org ruleset is what a
/// repository's own protection inherits (issue #329).
#[test]
fn organisation_rulesets_are_covered_like_repository_ones() {
    let policy = GitHubPolicy::default();
    for (method, path) in [
        ("PUT", "/orgs/acme/rulesets/5"),
        ("POST", "/orgs/acme/rulesets"),
        // Creating a repository ruleset can shadow an existing one, so the
        // create verb is covered alongside the update.
        ("POST", "/repos/o/r/rulesets"),
    ] {
        assert_eq!(
            policy.decision(method, path, b"{}"),
            PolicyDecision::Deny,
            "{method} {path} relaxes protection and must be blocked"
        );
    }
    assert_eq!(
        policy.decision("GET", "/orgs/acme/rulesets", b""),
        PolicyDecision::Allow,
        "reading the rules is not changing them"
    );
}

/// The body check is not defeated by spelling.
///
/// GitHub tolerates a trailing slash, and a field name is a field name
/// whatever case it arrives in; neither should decide whether a repository can
/// be published (issue #329).
#[test]
fn the_repository_patch_check_is_not_escaped_by_spelling() {
    let policy = GitHubPolicy::default();
    for (path, body) in [
        ("/repos/o/r/", &br#"{"visibility":"public"}"#[..]),
        ("/repos/o/r", br#"{"VISIBILITY":"public"}"#),
        ("/repos/o/r", br#"{"Private":false}"#),
    ] {
        assert_eq!(
            policy.decision("PATCH", path, body),
            PolicyDecision::Deny,
            "PATCH {path} must be blocked whatever the spelling"
        );
    }
}
