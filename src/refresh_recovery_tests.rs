//! Tests for the credential recovery ladder (issue #239).
//!
//! Every test drives a real credential file through a real token endpoint on
//! loopback, because the bug being fixed lives exactly in the seam between the
//! two: the router concluded "revoked" from an `invalid_grant` without ever
//! re-reading the file another holder had already rotated forward.

use std::sync::{Arc, Mutex};

use super::super::TokenCache;
use crate::credential_store::CredentialStore;
use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};

const NOW_MS: i64 = 1_700_000_000_000;

/// A Claude credential file in the layout the Claude CLI writes.
fn seed_credential(home: &std::path::Path, access: &str, refresh: &str, expires_at_ms: i64) {
    let document = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": access,
            "refreshToken": refresh,
            "expiresAt": expires_at_ms,
            "scopes": ["user:inference"],
        }
    });
    std::fs::write(
        home.join(".credentials.json"),
        serde_json::to_vec_pretty(&document).expect("serialize"),
    )
    .expect("seed credential");
}

fn token(access: &str, refresh: &str, expires_at_ms: i64) -> SubscriptionToken {
    SubscriptionToken {
        access_token: access.into(),
        refresh_token: Some(refresh.into()),
        expires_at_ms: Some(expires_at_ms),
        account_id: None,
        resource_url: None,
    }
}

/// One scripted answer from the token endpoint.
struct Answer {
    status: u16,
    body: &'static str,
    /// Delay before answering, so a test can hold the credential lock long
    /// enough for a second holder to contend for it.
    delay: std::time::Duration,
}

impl Answer {
    const fn new(status: u16, body: &'static str) -> Self {
        Self {
            status,
            body,
            delay: std::time::Duration::ZERO,
        }
    }

    const fn after(mut self, delay: std::time::Duration) -> Self {
        self.delay = delay;
        self
    }
}

/// Requests the stub endpoint received, as `(head, body)` pairs.
type Received = Arc<Mutex<Vec<(String, String)>>>;

/// Serve a scripted sequence of answers on loopback, recording every request.
///
/// `before_answer` runs with the zero-based request index *before* the response
/// is written, which is how a test simulates another holder rotating the chain
/// while our exchange is still in flight.
async fn scripted_endpoint(
    script: Vec<Answer>,
    before_answer: impl Fn(usize) + Send + 'static,
) -> (String, Received, tokio::task::JoinHandle<()>) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/v1/oauth/token", listener.local_addr().unwrap());
    let received: Received = Arc::new(Mutex::new(Vec::new()));
    let recorder = Arc::clone(&received);
    let handle = tokio::spawn(async move {
        for (index, answer) in script.into_iter().enumerate() {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut raw = Vec::new();
            let mut buf = [0u8; 4096];
            loop {
                let read = socket.read(&mut buf).await.unwrap();
                raw.extend_from_slice(&buf[..read]);
                let text = String::from_utf8_lossy(&raw);
                if read == 0
                    || text
                        .split_once("\r\n\r\n")
                        .is_some_and(|(_, body)| !body.is_empty())
                {
                    break;
                }
            }
            let request = String::from_utf8_lossy(&raw).to_string();
            let (head, body) = request.split_once("\r\n\r\n").unwrap();
            recorder
                .lock()
                .unwrap()
                .push((head.to_string(), body.to_string()));
            if !answer.delay.is_zero() {
                tokio::time::sleep(answer.delay).await;
            }
            before_answer(index);
            let status = answer.status;
            let body = answer.body;
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 {status} X\r\ncontent-type: application/json\r\ncontent-length: \
                         {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
            socket.flush().await.unwrap();
        }
    });
    (url, received, handle)
}

/// Stop waiting on the stub endpoint.
///
/// The script is only fully consumed when the ladder makes every exchange the
/// test expects, so a regression shows up as an unconsumed answer. Bounding the
/// wait turns that into an assertion failure a few seconds later instead of a
/// test run that hangs.
async fn drain(server: tokio::task::JoinHandle<()>) {
    assert!(
        tokio::time::timeout(std::time::Duration::from_secs(5), server)
            .await
            .is_ok(),
        "the ladder made fewer exchanges than the test scripted"
    );
}

const INVALID_GRANT: &str =
    r#"{"error":"invalid_grant","error_description":"refresh token not found"}"#;

#[path = "refresh_transaction_tests.rs"]
mod transaction;

/// The case from issue #239: our refresh token is rejected because another
/// holder already rotated the chain forward. Re-reading the credential is all
/// it takes to keep serving, so no `invalid_grant` may be reported as revoked
/// until that check has been made.
#[tokio::test]
async fn a_rotation_that_lands_during_the_exchange_is_adopted_instead_of_reported_as_revoked() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());

    // While the first exchange is in flight, a vendor CLI redeems the same link
    // and writes the rotation to disk.
    let rotated_home = home.path().to_path_buf();
    let (url, received, server) = scripted_endpoint(
        vec![
            Answer::new(400, INVALID_GRANT),
            Answer::new(
                200,
                r#"{"access_token":"access-3","refresh_token":"refresh-3","expires_in":3600}"#,
            ),
        ],
        move |index| {
            if index == 0 {
                seed_credential(&rotated_home, "access-2", "refresh-2", NOW_MS - 1);
            }
        },
    )
    .await;

    let cache = TokenCache::new();
    cache.register_reader("primary", &reader);
    let fresh = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            token("access-1", "refresh-1", NOW_MS - 1),
            NOW_MS,
        )
        .await;
    drain(server).await;

    assert_eq!(fresh.access_token, "access-3");
    // The second exchange must spend the *newer* link, not replay the rejected
    // one.
    let bodies: Vec<serde_json::Value> = {
        let requests = received.lock().unwrap();
        assert_eq!(requests.len(), 2, "one retry, not a loop");
        requests
            .iter()
            .map(|(_, body)| serde_json::from_str(body).expect("json body"))
            .collect()
    };
    assert_eq!(bodies[0]["refresh_token"], "refresh-1");
    assert_eq!(bodies[1]["refresh_token"], "refresh-2");

    // Nothing is reported as revoked, and the recovery says how it happened.
    assert_eq!(cache.last_refresh_error(SubscriptionProvider::Claude), None);
    assert_eq!(
        cache.last_recovery(SubscriptionProvider::Claude),
        Some("the stored refresh token was rejected; adopted a newer one from disk and retried")
    );
    // The rotation reached disk, so the next process start does not replay a
    // spent link.
    assert_eq!(
        CredentialStore::reload(&reader)
            .expect("credential")
            .refresh_token
            .as_deref(),
        Some("refresh-3")
    );
}

/// A credential the store has *not* rotated past is genuinely revoked, and must
/// still be terminal — but the message has to say which of the two causes it is
/// and where that was checked.
#[tokio::test]
async fn a_revoked_credential_stays_terminal_and_names_the_cause() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let (url, received, server) =
        scripted_endpoint(vec![Answer::new(400, INVALID_GRANT)], |_| {}).await;

    let cache = TokenCache::new();
    cache.register_reader("primary", &reader);
    let client = reqwest::Client::new();
    let stale = token("access-1", "refresh-1", NOW_MS - 1);
    let handed_back = cache
        .get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            stale.clone(),
            NOW_MS,
        )
        .await;
    // The unrefreshable token is handed back so the upstream, not a guess here,
    // decides whether it still works.
    assert_eq!(handed_back.access_token, "access-1");

    let message = cache
        .last_refresh_error(SubscriptionProvider::Claude)
        .expect("a terminal rejection is reported");
    assert!(
        message.contains("still holds the same refresh token that was just rejected"),
        "{message}"
    );
    assert!(
        message.contains("revoked or already spent elsewhere"),
        "{message}"
    );
    assert!(
        message.contains("link-assistant-router auth claude"),
        "{message}"
    );
    assert!(message.contains(".credentials.json"), "{message}");
    // The generic "waiting will not help" advice is the sentence issue #239
    // calls misleading; the ladder gives the checked one instead.
    assert!(!message.contains("waiting will not help"), "{message}");

    // A second call must not spend another exchange against a credential that
    // is known dead.
    let again = cache
        .get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            stale,
            NOW_MS + 1_000,
        )
        .await;
    assert_eq!(again.access_token, "access-1");
    drain(server).await;
    assert_eq!(received.lock().unwrap().len(), 1, "one exchange only");
}

/// Two holders of the same credential — here two `TokenCache`s, as two router
/// processes would be — must serialise their read → refresh → write cycles. The
/// one that loses the race observes the winner's rotation instead of spending
/// the refresh token a second time.
#[tokio::test]
async fn two_concurrent_refreshes_serialise_and_the_second_observes_the_first() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let (url, received, server) = scripted_endpoint(
        vec![
            Answer::new(
                200,
                r#"{"access_token":"access-2","refresh_token":"refresh-2","expires_in":3600}"#,
            )
            .after(std::time::Duration::from_millis(150)),
        ],
        |_| {},
    )
    .await;

    let first = TokenCache::new();
    let second = TokenCache::new();
    first.register_reader("primary", &reader);
    second.register_reader("primary", &reader);
    let client = reqwest::Client::new();
    let stale = token("access-1", "refresh-1", NOW_MS - 1);
    let (left, right) = tokio::join!(
        first.get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            stale.clone(),
            NOW_MS,
        ),
        second.get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            stale,
            NOW_MS,
        ),
    );
    drain(server).await;

    assert_eq!(left.access_token, "access-2");
    assert_eq!(right.access_token, "access-2");
    assert_eq!(
        received.lock().unwrap().len(),
        1,
        "the second holder must observe the first's rotation, not spend another exchange"
    );
    // Exactly one of the two adopted what the other wrote.
    let adopted = "adopted a newer credential from disk without spending an exchange";
    let rungs = [
        first.last_recovery(SubscriptionProvider::Claude),
        second.last_recovery(SubscriptionProvider::Claude),
    ];
    assert_eq!(
        rungs.iter().filter(|rung| **rung == Some(adopted)).count(),
        1,
        "{rungs:?}"
    );
    assert!(
        crate::credential_store::lock_path_for(&home.path().join(".credentials.json")).exists(),
        "the sidecar lock is what serialised them"
    );
}

/// An interrupted write must leave the previous credential intact: the router
/// writes to a temporary file and renames, so a process killed mid-write leaves
/// the old credential readable and a stray temporary behind, never a truncated
/// credential file.
#[test]
fn an_interrupted_write_leaves_the_previous_credential_intact() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());

    // What a crash between "write the temporary" and "rename it over" leaves:
    // the same `.{name}.{pid}.{uuid}.tmp` shape `atomic_write_owner_only` uses.
    let interrupted = home.path().join("..credentials.json.4242.deadbeef.tmp");
    std::fs::write(&interrupted, b"{\"claudeAiOauth\":{\"accessTok").expect("partial write");

    let intact = CredentialStore::reload(&reader).expect("the previous credential survives");
    assert_eq!(intact.access_token, "access-1");
    assert_eq!(intact.refresh_token.as_deref(), Some("refresh-1"));

    // The next write still lands, and lands whole.
    CredentialStore::persist(&reader, &token("access-2", "refresh-2", NOW_MS + 3_600_000))
        .expect("persist");
    let replaced = CredentialStore::reload(&reader).expect("credential");
    assert_eq!(replaced.refresh_token.as_deref(), Some("refresh-2"));
    let raw = std::fs::read_to_string(home.path().join(".credentials.json")).expect("read");
    let document: serde_json::Value = serde_json::from_str(&raw).expect("whole document");
    // Vendor fields this crate does not model are preserved by the rewrite.
    assert_eq!(document["claudeAiOauth"]["scopes"][0], "user:inference");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        let mode = std::fs::metadata(home.path().join(".credentials.json"))
            .expect("metadata")
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o600, "credentials stay owner-only");
    }
}

/// The rotation has to survive a restart: a refresh that only ever lived in
/// memory left a spent link on disk for the next process start to replay, which
/// is what made the failure self-perpetuating.
#[tokio::test]
async fn a_rotated_refresh_token_survives_a_process_restart() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let (url, received, server) = scripted_endpoint(
        vec![Answer::new(
            200,
            r#"{"access_token":"access-2","refresh_token":"refresh-2","expires_in":3600}"#,
        )],
        |_| {},
    )
    .await;

    let client = reqwest::Client::new();
    let before_restart = TokenCache::new();
    before_restart.register_reader("primary", &reader);
    let fresh = before_restart
        .get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            token("access-1", "refresh-1", NOW_MS - 1),
            NOW_MS,
        )
        .await;
    assert_eq!(fresh.access_token, "access-2");
    drop(before_restart);
    drain(server).await;

    // A fresh process reads the credential file, not the old cache.
    let after_restart = TokenCache::new();
    after_restart.register_reader("primary", &reader);
    let from_disk = reader.read_token().expect("credential on disk");
    assert_eq!(from_disk.refresh_token.as_deref(), Some("refresh-2"));
    let reused = after_restart
        .get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            from_disk,
            NOW_MS + 1_000,
        )
        .await;
    assert_eq!(reused.access_token, "access-2");
    assert_eq!(
        received.lock().unwrap().len(),
        1,
        "the restarted process must not need another exchange"
    );
}

/// Claude's token endpoint attests the client from the request itself, so the
/// exchange has to look like the one the vendor client sends.
#[tokio::test]
async fn the_claude_exchange_carries_the_vendor_client_headers() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let (url, received, server) = scripted_endpoint(
        vec![Answer::new(
            200,
            r#"{"access_token":"access-2","refresh_token":"refresh-2","expires_in":3600}"#,
        )],
        |_| {},
    )
    .await;

    let cache = TokenCache::new();
    cache.register_reader("primary", &reader);
    cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            token("access-1", "refresh-1", NOW_MS - 1),
            NOW_MS,
        )
        .await;
    drain(server).await;

    let head = {
        let requests = received.lock().unwrap();
        requests[0].0.to_ascii_lowercase()
    };
    assert!(head.contains("content-type: application/json"), "{head}");
    assert!(
        head.contains(&format!(
            "anthropic-beta: {}",
            crate::proxy::OAUTH_BETA_FLAG
        )),
        "{head}"
    );
    assert!(
        head.contains(&super::super::CLAUDE_OAUTH_USER_AGENT.to_ascii_lowercase()),
        "{head}"
    );
}

/// The last rung before an operator is bothered: every direct exchange was
/// rejected, so the vendor's own client is asked to rotate the chain and the
/// router adopts what it wrote.
#[cfg(unix)]
#[tokio::test]
async fn the_vendor_client_rotates_a_chain_the_router_could_not() {
    use std::os::unix::fs::PermissionsExt as _;

    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    // Every exchange the router can make is rejected, so the ladder has nothing
    // left but the vendor client.
    let (url, received, server) =
        scripted_endpoint(vec![Answer::new(400, INVALID_GRANT)], |_| {}).await;

    let stub = home.path().join("stub-vendor-cli");
    std::fs::write(
        &stub,
        format!(
            "#!/bin/sh\ncat > \"$CLAUDE_CONFIG_DIR/.credentials.json\" <<'JSON'\n{}\nJSON\n",
            serde_json::json!({
                "claudeAiOauth": {
                    "accessToken": "access-from-vendor",
                    "refreshToken": "refresh-from-vendor",
                    "expiresAt": NOW_MS + 3_600_000,
                    "scopes": ["user:inference"],
                }
            })
        ),
    )
    .expect("write stub");
    std::fs::set_permissions(&stub, std::fs::Permissions::from_mode(0o755)).expect("chmod stub");

    let cache = TokenCache::new();
    cache.register_reader("primary", &reader);
    cache.register_vendor_cli(
        "primary",
        Arc::new(crate::vendor_cli_refresh::VendorCli::claude(
            &stub,
            home.path(),
        )),
    );
    let fresh = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            token("access-1", "refresh-1", NOW_MS - 1),
            NOW_MS,
        )
        .await;
    drain(server).await;

    assert_eq!(fresh.access_token, "access-from-vendor");
    assert_eq!(
        received.lock().unwrap().len(),
        1,
        "the router stops exchanging once the client hands back a usable token"
    );
    assert_eq!(cache.last_refresh_error(SubscriptionProvider::Claude), None);
    assert_eq!(
        cache.last_recovery(SubscriptionProvider::Claude),
        Some(
            "every direct exchange was rejected; the vendor client rotated the chain and its \
             credential was adopted"
        )
    );
}

/// The vendor client sometimes leaves a rotated *refresh* token behind without
/// a usable access token — it wrote the chain forward and then failed, or its
/// access token is already spent. That link is still worth an exchange.
#[cfg(unix)]
#[tokio::test]
async fn a_link_the_vendor_client_left_behind_is_exchanged() {
    use std::os::unix::fs::PermissionsExt as _;

    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let (url, received, server) = scripted_endpoint(
        vec![
            Answer::new(400, INVALID_GRANT),
            Answer::new(
                200,
                r#"{"access_token":"access-4","refresh_token":"refresh-4","expires_in":3600}"#,
            ),
        ],
        |_| {},
    )
    .await;

    // Expired access token, newer refresh link: nothing to serve with, but
    // something to exchange.
    let stub = home.path().join("stub-vendor-cli");
    std::fs::write(
        &stub,
        format!(
            "#!/bin/sh\ncat > \"$CLAUDE_CONFIG_DIR/.credentials.json\" <<'JSON'\n{}\nJSON\n",
            serde_json::json!({
                "claudeAiOauth": {
                    "accessToken": "access-3-expired",
                    "refreshToken": "refresh-3",
                    "expiresAt": NOW_MS - 1,
                    "scopes": ["user:inference"],
                }
            })
        ),
    )
    .expect("write stub");
    std::fs::set_permissions(&stub, std::fs::Permissions::from_mode(0o755)).expect("chmod stub");

    let cache = TokenCache::new();
    cache.register_reader("primary", &reader);
    cache.register_vendor_cli(
        "primary",
        Arc::new(crate::vendor_cli_refresh::VendorCli::claude(
            &stub,
            home.path(),
        )),
    );
    let fresh = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            token("access-1", "refresh-1", NOW_MS - 1),
            NOW_MS,
        )
        .await;
    drain(server).await;

    assert_eq!(fresh.access_token, "access-4");
    let spent: Vec<String> = {
        let requests = received.lock().unwrap();
        requests
            .iter()
            .map(|(_, body)| {
                serde_json::from_str::<serde_json::Value>(body).expect("json body")["refresh_token"]
                    .as_str()
                    .unwrap_or_default()
                    .to_string()
            })
            .collect()
    };
    assert_eq!(spent, vec!["refresh-1", "refresh-3"]);
    // And the exchange the client's link earned is written back.
    assert_eq!(
        CredentialStore::reload(&reader)
            .expect("credential")
            .refresh_token
            .as_deref(),
        Some("refresh-4")
    );
}

/// When even the newer link on disk is rejected, the whole token family really
/// is gone — and the message has to say that it checked, rather than repeat the
/// same advice it would have given without looking.
#[tokio::test]
async fn a_family_that_is_revoked_wholesale_says_the_newer_link_was_tried_too() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());

    let rotated_home = home.path().to_path_buf();
    let (url, _received, server) = scripted_endpoint(
        vec![
            Answer::new(400, INVALID_GRANT),
            Answer::new(400, INVALID_GRANT),
        ],
        move |index| {
            if index == 0 {
                seed_credential(&rotated_home, "access-2", "refresh-2", NOW_MS - 1);
            }
        },
    )
    .await;

    let cache = TokenCache::new();
    cache.register_reader("primary", &reader);
    cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            token("access-1", "refresh-1", NOW_MS - 1),
            NOW_MS,
        )
        .await;
    drain(server).await;

    let reported = cache
        .last_refresh_error(SubscriptionProvider::Claude)
        .expect("a terminal rejection is reported");
    assert!(
        reported.contains("was rejected as well"),
        "the message must say the newer link was tried too: {reported}"
    );
    assert!(
        reported.contains("token family has been revoked"),
        "{reported}"
    );
    assert!(reported.contains(".credentials.json"), "{reported}");
    assert!(
        reported.contains("link-assistant-router auth claude"),
        "{reported}"
    );
}

/// The rotation guard of issue #319 must survive the way the router actually
/// runs: the ladder persists a rotated token to the same file `read_token`
/// reads, so the next inbound request hands `get_fresh_for` a credential that
/// differs from the one the attempt was keyed on.
///
/// If that difference is read as "the operator re-authenticated", the guard is
/// cleared seconds after it is armed and the freshly minted link is spent on
/// the next rejection — which is the incident, unchanged.
#[tokio::test]
async fn a_self_rotation_persisted_to_disk_does_not_clear_the_guard() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1", NOW_MS - 1);
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let cache = TokenCache::new();
    cache.register_reader("primary", &reader);

    // T+0 — a rejection is recovered from, and the rotation is written to disk.
    let (url, _received, server) = scripted_endpoint(
        vec![Answer::new(
            200,
            r#"{"access_token":"access-2","refresh_token":"refresh-2","expires_in":3600}"#,
        )],
        |_| {},
    )
    .await;
    let rotated = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            token("access-1", "refresh-1", NOW_MS - 1),
            NOW_MS,
        )
        .await
        .expect("the rejection must be recovered from");
    drain(server).await;
    assert_eq!(rotated.access_token, "access-2");

    // T+5s — an ordinary inbound request. The credential on disk is now the
    // rotated one, which is *not* a re-authentication by the operator.
    let disk_token = reader.read_token().expect("read the rotated credential");
    let _ = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            "http://must-not-be-called.invalid",
            SubscriptionProvider::Claude,
            "primary",
            disk_token.clone(),
            NOW_MS + 5_000,
        )
        .await;

    // T+10s — the 403 arrives. The guard must still hold: no exchange at all.
    let (url, received, server) =
        scripted_endpoint(vec![Answer::new(400, INVALID_GRANT)], |_| {}).await;
    let outcome = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            disk_token,
            NOW_MS + 10_000,
        )
        .await;

    assert!(outcome.is_none(), "nothing fresher can be obtained");
    assert!(
        received.lock().unwrap().is_empty(),
        "the token endpoint must not be contacted: spending the link the router \
         itself minted seconds earlier is the whole of issue #319"
    );
    server.abort();
}
