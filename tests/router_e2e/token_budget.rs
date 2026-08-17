use super::*;

/// A request whose declared output budget cannot fit under the remaining spend
/// cap is refused before dispatch, rather than being admitted and allowed to
/// push the persisted total past the cap (issue #195).
#[tokio::test]
async fn a_request_that_cannot_fit_the_spend_cap_is_rejected_before_dispatch() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let capped = router
        .token_manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "five token budget",
            max_tokens: Some(5),
            ..IssueRequest::default()
        })
        .expect("issue capped token");
    let body = json!({
        "model":"claude-sonnet-4-5",
        "max_tokens":64,
        "messages":[{"role":"user","content":"hi"}]
    });

    let rejected = router
        .client
        .post(format!("{}/v1/messages", router.url))
        .bearer_auth(&capped)
        .json(&body)
        .send()
        .await
        .expect("capped response");
    assert_eq!(rejected.status(), StatusCode::TOO_MANY_REQUESTS);
    assert!(
        rejected
            .text()
            .await
            .expect("limit error body")
            .contains("token limit")
    );
    // Nothing reached the upstream: the cap was enforced before dispatch, which
    // is what keeps the spend bounded rather than merely reported.
    assert_eq!(router.requests.lock().expect("stub requests").len(), 0);

    // A token without the cap is unaffected.
    let isolated = router
        .post("/v1/messages", &body)
        .send()
        .await
        .expect("isolated token response");
    assert_eq!(isolated.status(), StatusCode::OK);
    isolated.bytes().await.expect("consume isolated response");
    assert_eq!(router.requests.lock().expect("stub requests").len(), 1);
}

/// A request that fits is admitted, and its reservation is settled against the
/// usage the upstream actually reported so the budget is neither leaked nor
/// double-counted.
#[tokio::test]
async fn a_request_that_fits_is_admitted_and_settled_against_real_usage() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let (token, id) = router
        .token_manager
        .issue_with_id(&IssueRequest {
            ttl_hours: 1,
            label: "roomy budget",
            max_tokens: Some(100_000),
            ..IssueRequest::default()
        })
        .expect("issue token");
    let body = json!({
        "model":"claude-sonnet-4-5",
        "max_tokens":64,
        "messages":[{"role":"user","content":"hi"}]
    });

    let response = router
        .client
        .post(format!("{}/v1/messages", router.url))
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    response.bytes().await.expect("consume body");

    let record = router
        .token_manager
        .store()
        .get(&id)
        .expect("read record")
        .expect("record exists");
    // The reservation was released rather than left pinned against the cap.
    assert_eq!(
        record.reserved_tokens, 0,
        "reservation must be settled once the response completes"
    );
    // Only the upstream's reported usage is persisted -- not the reservation.
    assert!(
        record.used_tokens > 0,
        "actual upstream usage must be recorded"
    );
    assert!(
        record.used_tokens < 64,
        "the declared output budget must not be billed as if it were spent, got {}",
        record.used_tokens
    );
}

/// Concurrent requests reserve atomically, so several admissions cannot
/// collectively overshoot a cap that only one of them fits under.
#[tokio::test]
async fn concurrent_requests_cannot_overshoot_the_cap_together() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    // Room for exactly one request of the size below.
    let (token, id) = router
        .token_manager
        .issue_with_id(&IssueRequest {
            ttl_hours: 1,
            label: "single request budget",
            max_tokens: Some(70),
            ..IssueRequest::default()
        })
        .expect("issue token");
    let body = json!({
        "model":"claude-sonnet-4-5",
        "max_tokens":64,
        "messages":[{"role":"user","content":"hi"}]
    });

    let mut handles = Vec::new();
    for _ in 0..8 {
        let client = router.client.clone();
        let url = router.url.clone();
        let token = token.clone();
        let body = body.clone();
        handles.push(tokio::spawn(async move {
            client
                .post(format!("{url}/v1/messages"))
                .bearer_auth(token)
                .json(&body)
                .send()
                .await
                .map(|response| response.status())
        }));
    }

    let mut admitted = 0;
    for handle in handles {
        if handle.await.expect("join").expect("send") == StatusCode::OK {
            admitted += 1;
        }
    }

    // Only the requests whose reservations fit may be admitted; the rest are
    // rejected rather than all slipping through the pre-check together.
    assert_eq!(
        admitted, 1,
        "exactly one concurrent request fits the reserved budget"
    );
    let record = router
        .token_manager
        .store()
        .get(&id)
        .expect("read record")
        .expect("record exists");
    assert_eq!(record.reserved_tokens, 0, "all reservations must settle");
}

/// An upstream failure releases the reservation instead of leaking it, so the
/// cap does not silently shrink after errors.
#[tokio::test]
async fn a_rejected_request_does_not_leak_its_reservation() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let (token, id) = router
        .token_manager
        .issue_with_id(&IssueRequest {
            ttl_hours: 1,
            label: "leak check",
            max_tokens: Some(100_000),
            ..IssueRequest::default()
        })
        .expect("issue token");

    // A malformed body never reaches the upstream, but it has already been
    // admitted by the time it is rejected.
    let response = router
        .client
        .post(format!("{}/v1/messages", router.url))
        .bearer_auth(&token)
        .header("content-type", "application/json")
        .body("{ not json")
        .send()
        .await
        .expect("malformed response");
    assert!(response.status().is_client_error());

    let record = router
        .token_manager
        .store()
        .get(&id)
        .expect("read record")
        .expect("record exists");
    assert_eq!(
        record.reserved_tokens, 0,
        "a request that never dispatched must return its reservation"
    );
}
