//! Unit tests for [`crate::crater`].

use super::*;
use std::sync::{Arc, Mutex};

fn config() -> CraterConfig {
    CraterConfig::new(
        Some("https://tracker.example/inbox".to_string()),
        "https://router.example/actor/code",
        Some("https://tracker.example/projects/demo".to_string()),
        Duration::from_millis(1),
        Duration::from_millis(50),
    )
}

#[test]
fn normalizes_chat_request_into_ticket_fields() {
    let body = json!({
        "model": "gpt-4o-mini",
        "metadata": {
            "title": "Implement crater provider",
            "assignee": "https://tracker.example/actors/dev",
            "attributedTo": "https://tracker.example/actors/triage"
        },
        "messages": [
            {"role": "system", "content": "be concise"},
            {"role": "user", "content": [
                {"type": "text", "text": "Build the ForgeFed adapter"},
                {"type": "text", "text": "Return OpenAI JSON"}
            ]}
        ]
    });

    let request = normalize_chat_request(&body, "https://router.example/actor/code")
        .expect("request should normalize");

    assert_eq!(request.model, "gpt-4o-mini");
    assert_eq!(request.title, "Implement crater provider");
    assert_eq!(
        request.assignee.as_deref(),
        Some("https://tracker.example/actors/dev")
    );
    assert_eq!(
        request.attributed_to,
        "https://tracker.example/actors/triage"
    );
    assert!(request.content.contains("system: be concise"));
    assert!(request.content.contains("user: Build the ForgeFed adapter"));
    assert!(request.content.contains("Return OpenAI JSON"));
}

#[test]
fn builds_forgefed_offer_with_ticket_without_ticket_id() {
    let request = CraterTaskRequest {
        model: "gpt-4o-mini".into(),
        title: "Issue title".into(),
        content: "Issue content".into(),
        assignee: Some("https://tracker.example/actors/dev".into()),
        attributed_to: "https://router.example/actor/code".into(),
    };

    let activity = build_offer_activity(&request, &config()).expect("activity");
    let ticket = &activity["object"];

    assert_eq!(activity["type"], "Offer");
    assert_eq!(activity["actor"], "https://router.example/actor/code");
    assert_eq!(activity["target"], "https://tracker.example/projects/demo");
    assert_eq!(activity["to"][0], "https://tracker.example/projects/demo");
    assert_eq!(ticket["type"], "Ticket");
    assert_eq!(ticket["summary"], "Issue title");
    assert_eq!(ticket["content"], "Issue content");
    assert_eq!(ticket["attributedTo"], "https://router.example/actor/code");
    assert_eq!(ticket["assignee"], "https://tracker.example/actors/dev");
    assert!(ticket.get("id").is_none());
}

#[test]
fn parses_accept_result_uri_or_object_id() {
    assert_eq!(
        parse_accept_result(
            &json!({"type": "Accept", "result": "https://tracker.example/tasks/1"})
        )
        .expect("uri result"),
        "https://tracker.example/tasks/1"
    );
    assert_eq!(
        parse_accept_result(
            &json!({"type": "Accept", "result": {"id": "https://tracker.example/tasks/2"}})
        )
        .expect("object result"),
        "https://tracker.example/tasks/2"
    );
}

#[test]
fn maps_resolved_task_to_openai_response() {
    let result = CraterTaskResult {
        task_uri: "https://tracker.example/tasks/1".into(),
        model: "gpt-4o-mini".into(),
        content: "Task result".into(),
        raw: json!({"isResolved": true}),
    };

    let response = chat_completion_response(&result);

    assert_eq!(response["object"], "chat.completion");
    assert_eq!(response["model"], "gpt-4o-mini");
    assert_eq!(response["choices"][0]["message"]["role"], "assistant");
    assert_eq!(response["choices"][0]["message"]["content"], "Task result");
    assert_eq!(response["choices"][0]["finish_reason"], "stop");
}

#[tokio::test]
async fn task_provider_trait_submits_and_polls() {
    #[derive(Default)]
    struct StubProvider {
        submitted: Arc<Mutex<Vec<String>>>,
    }

    #[async_trait]
    impl TaskProvider for StubProvider {
        async fn submit_task(&self, request: &CraterTaskRequest) -> Result<String, CraterError> {
            self.submitted
                .lock()
                .expect("lock")
                .push(request.title.clone());
            Ok("https://tracker.example/tasks/1".into())
        }

        async fn poll_task(&self, task_uri: &str) -> Result<Value, CraterError> {
            Ok(json!({
                "id": task_uri,
                "isResolved": true,
                "result": {"content": "resolved output"}
            }))
        }
    }

    let provider = StubProvider::default();
    let request = CraterTaskRequest {
        model: "gpt-4o-mini".into(),
        title: "Task title".into(),
        content: "Task content".into(),
        assignee: None,
        attributed_to: "https://router.example/actor/code".into(),
    };

    let result = provider
        .complete_task(request)
        .await
        .expect("task should complete");

    assert_eq!(result.task_uri, "https://tracker.example/tasks/1");
    assert_eq!(result.content, "resolved output");
    assert_eq!(
        provider.submitted.lock().expect("lock").as_slice(),
        &["Task title".to_string()]
    );
}

#[test]
fn stream_frames_are_well_formed_sse() {
    let frames = chat_completion_stream_frames("crater-forgefed", "hello");
    assert!(frames.len() >= 2, "{frames:?}");
    assert!(
        frames.iter().all(|frame| frame.starts_with("data: ")),
        "{frames:?}"
    );
    assert!(
        frames.last().expect("last frame").contains("[DONE]"),
        "the stream must terminate with [DONE]"
    );
    assert!(
        frames.iter().any(|frame| frame.contains("hello")),
        "the content must be carried"
    );
}

#[test]
fn an_error_stream_frame_is_valid_sse_carrying_the_message() {
    let frame = error_stream_frame(&CraterError::MissingConfig("CRATER_FORGEFED_INBOX"));
    assert!(frame.starts_with("data: "), "{frame}");
    assert!(frame.contains("CRATER_FORGEFED_INBOX"), "{frame}");
}

#[test]
fn extracting_openai_content_handles_both_shapes() {
    assert_eq!(extract_openai_content(Some(&json!("plain"))), "plain");
    assert_eq!(
        extract_openai_content(Some(&json!([{"type": "text", "text": "a"}]))),
        "a"
    );
    assert_eq!(extract_openai_content(None), "");
}

#[test]
fn get_path_walks_nested_values() {
    let value = json!({"a": {"b": {"c": 7}}});
    assert_eq!(get_path(&value, &["a", "b", "c"]), Some(&json!(7)));
    assert_eq!(get_path(&value, &["a", "missing"]), None);
    assert_eq!(get_path(&value, &[]), Some(&value));
}

#[test]
fn an_sse_frame_serialises_its_value() {
    let frame = sse_frame(&json!({"id": "x"}));
    assert!(frame.starts_with("data: {"), "{frame}");
    assert!(frame.ends_with("\n\n"), "frames end with a blank line");
}

#[test]
fn normalising_a_chat_request_requires_a_model_and_messages() {
    let missing_model = normalize_chat_request(&json!({"messages": []}), "actor");
    assert!(matches!(
        missing_model,
        Err(CraterError::InvalidRequest(ref m)) if m.contains("model")
    ));

    let blank_model = normalize_chat_request(&json!({"model": "   ", "messages": []}), "actor");
    assert!(blank_model.is_err(), "a blank model is not a model");

    let missing_messages = normalize_chat_request(&json!({"model": "m"}), "actor");
    assert!(matches!(
        missing_messages,
        Err(CraterError::InvalidRequest(ref m)) if m.contains("messages")
    ));
}

#[test]
fn normalising_a_chat_request_joins_turns_and_keeps_the_first_user_line() {
    let request = normalize_chat_request(
        &json!({
            "model": "crater-forgefed",
            "messages": [
                {"role": "system", "content": "be terse"},
                {"role": "user", "content": "first question"},
                {"role": "assistant", "content": ""},
                {"role": "user", "content": "second question"}
            ]
        }),
        "https://router.test/actor/code",
    )
    .expect("a well-formed request");

    assert_eq!(request.model, "crater-forgefed");
    // Empty turns are dropped rather than emitted as blank lines.
    assert!(
        !request.content.contains("assistant:"),
        "{}",
        request.content
    );
    assert!(
        request.content.contains("system: be terse"),
        "{}",
        request.content
    );
    assert!(
        request.content.contains("user: first question"),
        "{}",
        request.content
    );
    // The first user turn becomes the task title.
    assert_eq!(request.title, "first question");
}

#[test]
fn task_resolution_is_read_from_the_activity() {
    assert!(is_resolved(&json!({"isResolved": true})));
    assert!(!is_resolved(&json!({"isResolved": false})));
    // Absent or wrongly typed means "not resolved", never a panic.
    assert!(!is_resolved(&json!({})));
    assert!(!is_resolved(&json!({"isResolved": "yes"})));
}

#[test]
fn usage_defaults_to_zero_when_the_task_reports_none() {
    let reported = usage_from_result(&json!({"usage": {"total_tokens": 12}}));
    assert_eq!(reported["total_tokens"], 12);

    let absent = usage_from_result(&json!({}));
    assert_eq!(absent["prompt_tokens"], 0);
    assert_eq!(absent["completion_tokens"], 0);
    assert_eq!(absent["total_tokens"], 0);
}

#[test]
fn a_completion_response_carries_the_model_and_content() {
    let response = chat_completion_response(&CraterTaskResult {
        task_uri: "https://tracker.test/task/1".to_string(),
        model: "crater-forgefed".to_string(),
        content: "answer".to_string(),
        raw: json!({"usage": {"total_tokens": 3}}),
    });
    assert_eq!(response["model"], "crater-forgefed");
    assert_eq!(response["object"], "chat.completion");
    assert_eq!(response["choices"][0]["message"]["content"], "answer");
    assert_eq!(response["usage"]["total_tokens"], 3);
}

#[test]
fn accept_results_are_parsed_from_both_uri_and_object_forms() {
    assert_eq!(
        parse_accept_result(&json!({"result": "https://tracker.test/task/1"}))
            .expect("a bare URI result"),
        "https://tracker.test/task/1"
    );
    assert_eq!(
        parse_accept_result(&json!({"result": {"id": "https://tracker.test/task/2"}}))
            .expect("an object result"),
        "https://tracker.test/task/2"
    );
}

#[test]
fn a_rejected_or_malformed_accept_is_an_error() {
    // An explicit Reject is reported as such rather than parsed further.
    assert!(matches!(
        parse_accept_result(&json!({"type": "Reject"})),
        Err(CraterError::InvalidResponse(ref m)) if m.contains("rejected")
    ));
    // Missing, empty, and wrongly typed results are all refused.
    for malformed in [
        json!({}),
        json!({"result": ""}),
        json!({"result": {}}),
        json!({"result": {"id": ""}}),
        json!({"result": 42}),
    ] {
        assert!(
            parse_accept_result(&malformed).is_err(),
            "{malformed} must not parse"
        );
    }
}

#[test]
fn the_model_listing_advertises_the_crater_model() {
    let listing = list_models();
    assert_eq!(listing["object"], "list");
    assert_eq!(listing["data"][0]["id"], DEFAULT_MODEL);
    assert_eq!(listing["data"][0]["owned_by"], "crater");
}

fn test_config(target: Option<&str>, inbox: Option<&str>) -> CraterConfig {
    CraterConfig {
        inbox: inbox.map(ToString::to_string),
        actor: "https://router.test/actor/code".to_string(),
        target: target.map(ToString::to_string),
        poll_interval: Duration::from_millis(10),
        poll_timeout: Duration::from_secs(1),
    }
}

fn test_request() -> CraterTaskRequest {
    CraterTaskRequest {
        model: "crater-forgefed".to_string(),
        title: "a title".to_string(),
        content: "the body".to_string(),
        assignee: None,
        attributed_to: "https://router.test/actor/code".to_string(),
    }
}

/// The Offer activity is the wire format the `ForgeFed` inbox receives, so its
/// shape is worth pinning.
#[test]
fn an_offer_activity_wraps_the_ticket_with_forgefed_context() {
    let offer = build_offer_activity(
        &test_request(),
        &test_config(Some("https://tracker.test"), None),
    )
    .expect("a well-formed offer");

    assert_eq!(offer["type"], "Offer");
    assert_eq!(offer["actor"], "https://router.test/actor/code");
    assert_eq!(offer["target"], "https://tracker.test");
    assert_eq!(offer["to"][0], "https://tracker.test");
    assert!(
        offer["@context"]
            .as_array()
            .expect("context array")
            .iter()
            .any(|entry| entry == "https://forgefed.org/ns"),
        "the ForgeFed context must be declared"
    );

    let ticket = &offer["object"];
    assert_eq!(ticket["type"], "Ticket");
    assert_eq!(ticket["summary"], "a title");
    assert_eq!(ticket["content"], "the body");
    assert_eq!(ticket["model"], "crater-forgefed");
    assert_eq!(ticket["source"]["content"], "the body");
    // No assignee was requested, so none is asserted.
    assert!(ticket.get("assignee").is_none());
}

#[test]
fn an_offer_falls_back_to_the_inbox_when_no_target_is_configured() {
    let offer = build_offer_activity(
        &test_request(),
        &test_config(None, Some("https://inbox.test")),
    )
    .expect("inbox is used as the target");
    assert_eq!(offer["target"], "https://inbox.test");

    // With neither, the misconfiguration is reported rather than guessed.
    let missing = build_offer_activity(&test_request(), &test_config(None, None));
    assert!(matches!(
        missing,
        Err(CraterError::MissingConfig(name)) if name.contains("CRATER_FORGEFED")
    ));
}

#[test]
fn an_assignee_is_carried_onto_the_ticket() {
    let request = CraterTaskRequest {
        assignee: Some("https://tracker.test/user/1".to_string()),
        ..test_request()
    };
    let offer = build_offer_activity(&request, &test_config(Some("https://tracker.test"), None))
        .expect("offer");
    assert_eq!(offer["object"]["assignee"], "https://tracker.test/user/1");
}

/// Each provider error maps onto the status a client should see, and renders a
/// message that names the cause.
#[test]
fn crater_errors_map_onto_status_codes_and_messages() {
    let cases = [
        (
            CraterError::MissingConfig("CRATER_FORGEFED_INBOX"),
            StatusCode::BAD_GATEWAY,
            "CRATER_FORGEFED_INBOX",
        ),
        (
            CraterError::InvalidRequest("model is required".into()),
            StatusCode::BAD_REQUEST,
            "model is required",
        ),
        (
            CraterError::InvalidResponse("missing result".into()),
            StatusCode::BAD_GATEWAY,
            "missing result",
        ),
        (
            CraterError::Upstream("connection refused".into()),
            StatusCode::BAD_GATEWAY,
            "connection refused",
        ),
    ];
    for (error, status, needle) in cases {
        assert_eq!(error.status_code(), status, "{error}");
        assert!(error.to_string().contains(needle), "{error}");
    }

    // A delivery failure renders with and without an upstream message.
    let bare = CraterError::Delivery {
        status: 503,
        message: String::new(),
    };
    assert_eq!(bare.status_code(), StatusCode::BAD_GATEWAY);
    assert!(bare.to_string().contains("503"), "{bare}");
    let detailed = CraterError::Delivery {
        status: 503,
        message: "inbox down".into(),
    };
    assert!(detailed.to_string().contains("inbox down"), "{detailed}");

    // A timeout reports the task and the elapsed budget in seconds.
    let timeout = CraterError::Timeout {
        task_uri: "https://tracker.test/task/9".into(),
        timeout: Duration::from_secs(45),
    };
    assert_eq!(timeout.status_code(), StatusCode::GATEWAY_TIMEOUT);
    assert!(timeout.to_string().contains("task/9"), "{timeout}");
    assert!(timeout.to_string().contains("45"), "{timeout}");
}
