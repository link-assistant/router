use super::claude_selector::{catalog_model, seed_home};
use super::*;

/// The real CLI must send the fresh default, answer successfully, keep saved
/// `FlashX` and surface a preferred-model failure without silently substituting.
#[test]
fn current_claude_fresh_saved_and_failed_flagship_requests_are_exact() {
    if !enabled() {
        return;
    }
    let home = tempfile::tempdir().unwrap();
    let directory = Path::new(env!("CARGO_MANIFEST_DIR"));
    let profile = home
        .path()
        .join(".config/link-assistant-router/clients/claude/home");
    seed_home(&profile, directory);
    let models = vec![
        catalog_model("glm-5.3", "z.ai"),
        catalog_model("glm-5.3-flashx", "z.ai"),
    ];
    let router = MockRouter::start_with_models(CLAUDE, models.clone());
    let invoke = |router: &MockRouter, explicit| {
        run_wrapper_with_options(
            CLAUDE,
            directory,
            home.path(),
            &router.origin,
            explicit,
            &["--verbose", "--output-format", "stream-json", PROMPT],
        )
    };
    let check =
        |router: &MockRouter, output: &Output, model: &str, default_model: &str| {
            assert!(output.status.success(), "real Claude exchange failed");
            let events: Vec<Value> = String::from_utf8_lossy(&output.stdout)
                .lines()
                .filter_map(|line| serde_json::from_str(line).ok())
                .collect();
            assert!(events.iter().any(|event| event["type"] == "assistant"
            && event["message"]["model"] == model), "exact native response model missing");
            assert!(
                events.iter().any(|event| event["type"] == "result"
                    && event["is_error"] == false
                    && event["result"]
                        .as_str()
                        .is_some_and(|text| text.contains(ANSWER))),
                "successful response missing"
            );
            let requests = router.inference_requests(CLAUDE.inference_path);
            assert!(!requests.is_empty());
            // Older Claude also sends an auxiliary no-tools request using its
            // Default family. A saved /model controls the conversation, while
            // that Default remains the catalog-authorized flagship (#630).
            let conversation: Vec<_> = requests
                .iter()
                .filter(|request| {
                    request.json_body()["tools"]
                        .as_array()
                        .is_some_and(|tools| !tools.is_empty())
                })
                .collect();
            assert!(
                !conversation.is_empty(),
                "tool-capable conversation request absent"
            );
            assert!(
                conversation
                    .iter()
                    .all(|request| request.json_body()["model"] == model),
                "expected {model}; observed inference model IDs: {:?}",
                requests
                    .iter()
                    .map(|request| request.json_body()["model"].clone())
                    .collect::<Vec<_>>()
            );
            assert!(
                requests.iter().all(|request| [model, default_model]
                    .iter()
                    .any(|model| request.json_body()["model"] == *model)),
                "unauthorized auxiliary model"
            );
        };
    check(&router, &invoke(&router, None), "glm-5.3", "glm-5.3");
    std::fs::write(
        profile.join("settings.json"),
        json!({"model":"glm-5.3-flashx"}).to_string(),
    )
    .unwrap();
    let saved = MockRouter::start_with_models(CLAUDE, models.clone());
    check(&saved, &invoke(&saved, None), "glm-5.3-flashx", "glm-5.3");
    let explicit = MockRouter::start_with_models(CLAUDE, models.clone());
    check(
        &explicit,
        &invoke(&explicit, Some("glm-5.3")),
        "glm-5.3",
        "glm-5.3",
    );
    std::fs::remove_file(profile.join("settings.json")).unwrap();
    let mut failed_models = models;
    failed_models[0]["fixture_fail_inference"] = json!(true);
    let failed = MockRouter::start_with_models(CLAUDE, failed_models);
    assert!(!invoke(&failed, None).status.success());
    let requests = failed.inference_requests(CLAUDE.inference_path);
    assert!(!requests.is_empty());
    assert!(
        requests
            .iter()
            .all(|request| request.json_body()["model"] == "glm-5.3")
    );
    let remaining =
        MockRouter::start_with_models(CLAUDE, vec![catalog_model("glm-5.3-flashx", "z.ai")]);
    check(
        &remaining,
        &invoke(&remaining, None),
        "glm-5.3-flashx",
        "glm-5.3-flashx",
    );
}
