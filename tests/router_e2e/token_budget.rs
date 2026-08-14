use super::*;

#[tokio::test]
async fn actual_token_spend_rejects_only_the_exhausted_token() {
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

    let first = router
        .client
        .post(format!("{}/v1/messages", router.url))
        .bearer_auth(&capped)
        .json(&body)
        .send()
        .await
        .expect("first capped response");
    assert_eq!(first.status(), StatusCode::OK);
    first.bytes().await.expect("consume first response body");

    let rejected = router
        .client
        .post(format!("{}/v1/messages", router.url))
        .bearer_auth(&capped)
        .json(&body)
        .send()
        .await
        .expect("exhausted response");
    assert_eq!(rejected.status(), StatusCode::TOO_MANY_REQUESTS);
    assert!(
        rejected
            .text()
            .await
            .expect("limit error body")
            .contains("token limit")
    );
    assert_eq!(router.requests.lock().expect("stub requests").len(), 1);

    let isolated = router
        .post("/v1/messages", &body)
        .send()
        .await
        .expect("isolated token response");
    assert_eq!(isolated.status(), StatusCode::OK);
    isolated.bytes().await.expect("consume isolated response");
    assert_eq!(router.requests.lock().expect("stub requests").len(), 2);
}
