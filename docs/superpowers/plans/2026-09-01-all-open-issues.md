# All Open Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix GitHub issues #376–#380 in one pull request, merge it, and verify
the resulting patch release is delivered.

**Architecture:** Make protocol intent explicit at the existing router
boundaries: login status selects polling, API dialect renders extractor errors,
provider capabilities reconcile parameters, Codex CLI flags overlay user
configuration, and a Responses mode controls Codex body normalization. Preserve
legacy behavior everywhere that does not opt into the new mode.

**Tech Stack:** Rust 2024, Axum, Tokio, Reqwest, Serde JSON, Cargo tests, GitHub
Actions and GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-09-01-all-open-issues-design.md`

## Global Constraints

- Deliver issues #376, #377, #378, #379, and #380 in one pull request.
- Add no new dependency.
- Keep tokens out of files, command arguments, diagnostics, and arbitrary
  forwarded headers.
- Preserve unknown-provider pass-through behavior.
- Preserve standard Codex Responses normalization and explicit
  `--isolated-config` behavior.
- If the release fails, diagnose and repair it in a focused follow-up pull
  request, then repeat release verification.

---

### Task 1: Status-driven remote Codex device login (#376)

**Files:**
- Modify: `src/auth_remote.rs`
- Test: `src/auth_remote_tests.rs`

**Interfaces:**
- Consumes: `status_of(&Value) -> &str` and
  `poll_until_authorized(&Client, &ResolvedServer, &str, &str)`.
- Produces: remote device responses with `status == "awaiting_device"` always
  enter the polling loop regardless of presentation fields.

- [ ] **Step 1: Make the existing device fixture reproduce the report**

Add the verification URL to the first response and assert no code endpoint is
used:

```rust
r#"{"login_id":"dev","provider":"codex","status":"awaiting_device","url":"https://auth.openai.com/codex/device","user_code":"ABCD-EFGH","session_expires_at":"2030-01-01T00:00:00Z"}"#,
// after joining the server:
assert!(seen.iter().skip(1).all(|request| !request.contains("/code")));
```

- [ ] **Step 2: Run the regression and verify it fails**

Run: `cargo test --locked auth_remote_tests::a_device_flow_is_polled_until_the_router_authorizes_it -- --nocapture`

Expected: FAIL because the implementation asks for a pasted code instead of
issuing `GET /api/login/dev`.

- [ ] **Step 3: Select the device flow by status**

Replace the incidental URL/user-code condition with:

```rust
if status_of(&begun) == "awaiting_device" {
    return poll_until_authorized(&client, server, &login_id, provider).await;
}
```

Keep the already-authorized branch before it and code submission after it.

- [ ] **Step 4: Run the remote-auth tests**

Run: `cargo test --locked auth_remote_tests -- --nocapture`

Expected: PASS.

- [ ] **Step 5: Commit the isolated fix**

```bash
git add src/auth_remote.rs src/auth_remote_tests.rs
git commit -m "fix: poll remote Codex device login"
```

### Task 2: Gemini-dialect malformed JSON (#377)

**Files:**
- Modify: `src/api_error.rs`
- Modify: `src/gemini/native.rs`
- Test: `tests/gemini_namespace_test.rs`

**Interfaces:**
- Consumes: `PresentedError::render(ApiDialect::Gemini)` and Axum
  `JsonRejection`.
- Produces:
  `malformed_json_response_for_dialect(ApiDialect, &str) -> Response`; native
  handlers accept `Result<Json<Value>, JsonRejection>`.

- [ ] **Step 1: Add malformed-body integration cases**

Use the existing Gemini namespace test server and token helper. For each of
these paths, POST `{"contents":[` with `content-type: application/json`:

```rust
[
    "/api/gemini/v1beta/models/gpt-5.6-sol:generateContent",
    "/api/gemini/v1beta/models/gpt-5.6-sol:streamGenerateContent",
    "/api/vertex/v1/projects/p/locations/us/publishers/google/models/gpt-5.6-sol:generateContent",
]
```

For every response assert:

```rust
assert_eq!(response.status(), reqwest::StatusCode::BAD_REQUEST);
assert_eq!(response.headers()["content-type"], "application/json");
let body: serde_json::Value = response.json().await.unwrap();
assert_eq!(body["error"]["code"], 400);
assert_eq!(body["error"]["status"], "INVALID_ARGUMENT");
assert!(body["error"]["message"]
    .as_str().unwrap()
    .starts_with("Failed to parse request body as JSON:"));
```

- [ ] **Step 2: Run the new integration test and verify it fails**

Run: `cargo test --locked --test gemini_namespace_test malformed_json -- --nocapture`

Expected: FAIL because Axum's rejection is not the Gemini envelope.

- [ ] **Step 3: Add a dialect-aware malformed JSON helper**

In `src/api_error.rs` add:

```rust
pub fn malformed_json_response_for_dialect(dialect: ApiDialect, error: &str) -> Response {
    PresentedError {
        status: StatusCode::BAD_REQUEST,
        error_type: "invalid_request_error",
        message: &format!("Failed to parse request body as JSON: {error}"),
    }
    .render(dialect)
}
```

Have the existing surface helper delegate to it after mapping its surface.

- [ ] **Step 4: Handle extraction inside both native handlers**

Use this argument and branch in `forward_native_gemini` and
`forward_native_vertex`:

```rust
body: Result<axum::Json<Value>, axum::extract::rejection::JsonRejection>,
```

```rust
let body = match body {
    Ok(axum::Json(body)) => body,
    Err(error) => {
        return crate::api_error::malformed_json_response_for_dialect(
            crate::api_error::ApiDialect::Gemini,
            &error.to_string(),
        );
    }
};
```

- [ ] **Step 5: Run focused and shared error tests**

Run: `cargo test --locked --test gemini_namespace_test -- --nocapture`

Run: `cargo test --locked api_error::tests -- --nocapture`

Expected: PASS.

- [ ] **Step 6: Commit the isolated fix**

```bash
git add src/api_error.rs src/gemini/native.rs tests/gemini_namespace_test.rs
git commit -m "fix: render malformed Gemini JSON errors"
```

### Task 3: Codex `top_p` capability reconciliation (#378)

**Files:**
- Modify: `src/capabilities.rs`
- Modify: `src/openai.rs`
- Test: `src/capabilities.rs`
- Test: `src/subscription_proxy_tests.rs`
- Test: `tests/gemini_namespace_test.rs`

**Interfaces:**
- Consumes: `ProviderCapabilities` and
  `reconcile_subscription_parameters(SubscriptionProvider, &mut Value)`.
- Produces: `ProviderCapabilities::top_p`; Codex removes `top_p`, native and
  unknown providers preserve it.

- [ ] **Step 1: Add capability and direct-normalizer regressions**

Extend the matrix tests:

```rust
assert_eq!(subscription(SubscriptionProvider::Codex, None).top_p,
           Capability::Unsupported);
assert_eq!(subscription(SubscriptionProvider::Claude, None).top_p,
           Capability::Native);
assert_eq!(upstream(UpstreamProvider::OpenAICompatible).top_p,
           Capability::Unknown);
```

Add a proxy-unit body containing only `top_p` and assert Codex removes it.
Also reconcile the same body for Claude and assert it remains.

- [ ] **Step 2: Add the Gemini-to-Codex integration regression**

Extend the existing captured Codex namespace request with:

```json
{"generationConfig":{"topP":0.9}}
```

Assert on the captured OpenAI-shaped upstream body:

```rust
assert!(forwarded.get("top_p").is_none(), "{forwarded:#}");
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run: `cargo test --locked capabilities::tests -- --nocapture`

Run: `cargo test --locked subscription_proxy::tests::codex_strips_unsupported_top_p -- --nocapture`

Run: `cargo test --locked --test gemini_namespace_test top_p -- --nocapture`

Expected: compile/test failure because `top_p` is not yet a capability and is
forwarded to Codex.

- [ ] **Step 4: Extend the capability matrix**

Add the field:

```rust
pub top_p: Capability,
```

Set it to `Unsupported` for Codex, `Native` for Claude/Qwen/Gemini, and
`Unknown` in the compatible-provider fallback.

- [ ] **Step 5: Reconcile the field centrally**

In `reconcile_subscription_parameters_with_limit_origin`, reuse the mutable
object and add:

```rust
if capabilities.top_p == crate::capabilities::Capability::Unsupported {
    object.remove("top_p");
}
```

Only remove fields explicitly marked unsupported.

- [ ] **Step 6: Run matrix, proxy, and cross-vendor suites**

Run: `cargo test --locked capabilities::tests -- --nocapture`

Run: `cargo test --locked subscription_proxy::tests -- --nocapture`

Run: `cargo test --locked --test gemini_namespace_test -- --nocapture`

Run: `cargo test --locked --test cross_vendor_translation_test -- --nocapture`

Expected: PASS, including the existing lone-`top_p` Claude test.

- [ ] **Step 7: Commit the isolated fix**

```bash
git add src/capabilities.rs src/openai.rs src/subscription_proxy_tests.rs tests/gemini_namespace_test.rs
git commit -m "fix: reconcile top-p with Codex capabilities"
```

### Task 4: Overlay router settings onto the real Codex config (#379)

**Files:**
- Modify: `src/with_command.rs`
- Test: `src/with_command_tests.rs`
- Test: `tests/with_router_test.rs`
- Modify: `docs/use-cases/with-router.md`
- Modify: `docs/use-cases/cli-codex.md`

**Interfaces:**
- Consumes: Codex `-c key=TOML_VALUE` global CLI configuration and inherited
  `HOME`/`CODEX_HOME`.
- Produces: `append_codex_router_overrides(&mut Command, &str) -> Result<(),
  AnyError>`; normal Codex runs extend user configuration, isolated runs retain
  disposable config.

- [ ] **Step 1: Rewrite the process contract as a failing regression**

Seed the real file with settings unrelated to routing:

```toml
model_provider = "user-owned"
model_reasoning_effort = "xhigh"
personality = "pragmatic"

[mcp_servers.memory]
command = "memory-server"
```

Update the fake Codex executable to capture `HOME`, `CODEX_HOME`, every argv
element, and the real config. Assert:

```rust
assert_eq!(captured_home.trim(), home.to_string_lossy());
assert_eq!(fs::read_to_string(&config).unwrap(), original);
assert!(args.contains("model_provider=\"link-assistant\""));
assert!(args.contains("model_providers.link-assistant.wire_api=\"responses\""));
assert!(args.contains(&format!(
    "model_providers.link-assistant.base_url=\"{server}/v1\""
)));
assert!(args.find("model_provider=").unwrap() < args.find("--global").unwrap());
```

Retain/add an isolated-mode test asserting captured `HOME` differs and the
generated isolated config routes through the router.

- [ ] **Step 2: Run the with-command suites and verify failure**

Run: `cargo test --locked with_command::tests -- --nocapture`

Run: `cargo test --locked --test with_router_test router_with_ -- --nocapture`

Expected: FAIL because normal Codex runs use a router-owned home.

- [ ] **Step 3: Mark normal Codex runs as extensible**

At the start of `extends_user_configuration`, after the isolation check:

```rust
if isolated_config {
    return false;
}
if matches!(client, ClientKind::Codex) {
    return true;
}
```

Keep Gemini's written-configuration rule and environment-based rule for all
other clients.

- [ ] **Step 4: Add TOML-safe Codex overrides before launch arguments**

Implement:

```rust
fn append_codex_router_overrides(command: &mut Command, base_url: &str) -> Result<(), AnyError> {
    for (key, value) in [
        ("model_provider", "link-assistant".to_string()),
        ("model_providers.link-assistant.name", "Link.Assistant.Router".to_string()),
        ("model_providers.link-assistant.base_url", endpoint(base_url, "/v1")),
        ("model_providers.link-assistant.env_key", "LINK_ASSISTANT_TOKEN".to_string()),
        ("model_providers.link-assistant.wire_api", "responses".to_string()),
    ] {
        command.arg("-c").arg(format!("{key}={}", serde_json::to_string(&value)?));
    }
    Ok(())
}
```

Call it in the `ClientKind::Codex` match arm only when `!isolated_config`.
Because `prepare` builds these arguments before `launch` appends user arguments,
the global configuration flags precede any subcommand.

- [ ] **Step 5: Run normal and isolated contract tests**

Run: `cargo test --locked with_command::tests -- --nocapture`

Run: `cargo test --locked --test with_router_test -- --nocapture`

Expected: PASS.

- [ ] **Step 6: Update user-facing docs**

Change the Codex row in `with-router.md` from router profile to CLI overlay.
State in both documents that normal `with` runs retain user config, MCP
servers, personality, reasoning settings, sessions, and `CODEX_HOME`, while
`--isolated-config` deliberately uses a disposable config. Explain that the
token stays in `LINK_ASSISTANT_TOKEN`.

- [ ] **Step 7: Commit the isolated fix**

```bash
git add src/with_command.rs src/with_command_tests.rs tests/with_router_test.rs docs/use-cases/with-router.md docs/use-cases/cli-codex.md
git commit -m "fix: preserve Codex config in router with"
```

### Task 5: Preserve Codex Responses Lite tools (#380)

**Files:**
- Modify: `src/subscription_proxy.rs`
- Test: `src/subscription_proxy_tests.rs`
- Create: `tests/fixtures/clients/codex-exec-0.151.0.responses-lite.json`
- Test: `tests/client_fixture_test.rs`

**Interfaces:**
- Consumes: inbound header
  `x-openai-internal-codex-responses-lite: true` and Codex 0.151's
  `additional_tools` input item.
- Produces: `CodexResponsesMode::{Standard, Lite}`;
  `normalize_subscription_request(SubscriptionProvider, &mut Value,
  CodexResponsesMode)`; only validated Lite markers are forwarded.

- [ ] **Step 1: Record the 0.151 Responses Lite request fixture**

Create a normal client fixture using the repository's existing schema. Its
request body must include this exact protocol shape:

```json
{
  "model": "gpt-5.6-sol",
  "instructions": "",
  "input": [
    {
      "type": "additional_tools",
      "id": "1",
      "role": "developer",
      "tools": [
        {
          "name": "shell",
          "description": "Runs a shell command",
          "input_schema": {"type": "object"}
        }
      ]
    },
    {
      "type": "message",
      "role": "user",
      "content": [{"type": "input_text", "text": "Use the shell tool"}]
    }
  ],
  "stream": true,
  "store": false
}
```

Include the Lite marker in the fixture headers and match the authentication and
path fields used by the adjacent Codex fixture.

- [ ] **Step 2: Add mode and header regression tests**

Construct a body with the fixture's first item and normalize it in Lite mode:

```rust
normalize_subscription_request(
    SubscriptionProvider::Codex,
    &mut body,
    CodexResponsesMode::Lite,
);
assert_eq!(body["input"][0]["type"], "additional_tools");
assert_eq!(body["input"][0]["tools"][0]["name"], "shell");
assert_eq!(body["instructions"], "");
```

Add a Standard-mode assertion proving the existing developer-message hoisting
still applies. Add header tests proving `true` is recognized and forwarded for
Codex, while `false`, arbitrary values, and all non-Codex providers are not.

- [ ] **Step 3: Run focused tests and verify they fail**

Run: `cargo test --locked subscription_proxy::tests::codex_responses_lite -- --nocapture`

Run: `cargo test --locked --test client_fixture_test -- --nocapture`

Expected: compile/test failure because there is no wire-mode distinction and
the legacy normalizer deletes `additional_tools`.

- [ ] **Step 4: Add the explicit wire mode**

Implement:

```rust
const CODEX_RESPONSES_LITE_HEADER: &str =
    "x-openai-internal-codex-responses-lite";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum CodexResponsesMode {
    Standard,
    Lite,
}

fn codex_responses_mode(provider: SubscriptionProvider, headers: &HeaderMap)
    -> CodexResponsesMode
{
    let enabled = provider == SubscriptionProvider::Codex
        && headers.get(CODEX_RESPONSES_LITE_HEADER)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| value.trim().eq_ignore_ascii_case("true"));
    if enabled { CodexResponsesMode::Lite } else { CodexResponsesMode::Standard }
}
```

Compute it once before normalization and reuse it for the initial request and
the token-refresh retry.

- [ ] **Step 5: Preserve Lite input while retaining shared Codex constraints**

Change `normalize_codex_responses_body` to accept the mode. Keep reasoning,
`stream`, `store`, and output-cap reconciliation before this branch:

```rust
if mode == CodexResponsesMode::Lite {
    return;
}
```

Place it before standard input normalization, developer/system hoisting, and
default-instruction insertion. Do not replace an explicitly empty Lite
`instructions` value.

- [ ] **Step 6: Forward only the validated protocol marker**

Pass the mode to `subscription_headers`. In its Codex branch add:

```rust
if mode == CodexResponsesMode::Lite {
    out.push((CODEX_RESPONSES_LITE_HEADER, "true".to_string()));
}
```

Do not read or forward any other inbound client header.

- [ ] **Step 7: Run fixture, proxy, and real-client-shape tests**

Run: `cargo test --locked subscription_proxy::tests -- --nocapture`

Run: `cargo test --locked --test client_fixture_test -- --nocapture`

Run: `cargo test --locked --test real_clients_test -- --nocapture`

Expected: PASS (credentialed opt-in cases may remain ignored); Standard-mode
regressions must still pass.

- [ ] **Step 8: Commit the isolated fix**

```bash
git add src/subscription_proxy.rs src/subscription_proxy_tests.rs tests/fixtures/clients/codex-exec-0.151.0.responses-lite.json tests/client_fixture_test.rs
git commit -m "fix: preserve Codex Responses Lite tools"
```

### Task 6: Changelog and complete local verification

**Files:**
- Create: `changelog.d/20260901_120000_all-open-issues.md`
- Modify only if required by repository checks: generated documentation or
  committed UI artifacts named by the failing check.

**Interfaces:**
- Consumes: all five independently passing fixes.
- Produces: one patch-release changelog fragment and a clean, fully verified
  branch.

- [ ] **Step 1: Add the patch changelog fragment**

Use repository frontmatter and five user-facing bullets:

```markdown
---
type: patch
---

- Poll remote Codex device logins when the router returns a verification URL.
- Return malformed Gemini and Vertex JSON errors in the Gemini API envelope.
- Remove unsupported `topP` sampling from Gemini requests routed to Codex.
- Preserve Codex settings and sessions during ordinary `router with codex` runs.
- Preserve Codex Responses Lite tool declarations for current Codex CLI clients.
```

- [ ] **Step 2: Format and check the code**

Run: `cargo fmt --all -- --check`

Run: `cargo check --locked --all-targets`

Run: `cargo clippy --locked --all-targets -- -D warnings`

Expected: all exit 0.

- [ ] **Step 3: Run the complete test suite outside filesystem/network sandbox limits**

Run: `cargo test --locked`

Expected: all tests pass. If the known baseline login process timing test alone
fails under full parallel load, rerun its complete test binary unchanged and
record both outputs; any new or repeated failure is investigated and fixed
before proceeding.

- [ ] **Step 4: Run repository release/changelog gates**

Read `.github/workflows/release.yml` and invoke every local script/check it
references that is safe before publication, including the changelog validator.
Expected: all exit 0 and no generated diff remains unexplained.

- [ ] **Step 5: Review the branch diff for scope and secrets**

Run: `git diff --check origin/main...HEAD`

Run: `git diff --stat origin/main...HEAD`

Run: `git status --short`

Inspect the full diff and search it for `la_sk_`, bearer tokens, and accidental
credentials. Expected: only intended fixture placeholders and no live secret.

- [ ] **Step 6: Commit release metadata**

```bash
git add changelog.d/20260901_120000_all-open-issues.md
git commit -m "docs: describe all open issue fixes"
```

### Task 7: One PR, merge, release, and delivery verification

**Files:** None unless CI or release diagnosis proves a repair is required.

**Interfaces:**
- Consumes: verified branch and changelog fragment.
- Produces: merged pull request closing #376–#380 and a successful published
  patch release for its merge commit.

- [ ] **Step 1: Refresh open issues and branch base**

Run: `gh api repos/link-assistant/router/issues --paginate -f state=open`

Run: `git fetch origin main`

Rebase only if needed and rerun affected/full verification. Confirm the five
required issues are still the complete open set before creating the PR.

- [ ] **Step 2: Push and create the single PR**

Push `fix/issues-376-380`. Create one PR whose body contains:

```markdown
Closes #376
Closes #377
Closes #378
Closes #379
Closes #380
```

Include local verification commands and their outcomes.

- [ ] **Step 3: Wait for every required PR check**

Run: `gh pr checks --watch`

Inspect logs for any failure. Apply the systematic-debugging workflow, push the
minimal fix to the same PR, and repeat until every check is green.

- [ ] **Step 4: Refresh issue scope once more and merge**

Query open issues immediately before merge. Confirm #376–#380 are represented
by the same PR, then merge using the repository's established merge method.

- [ ] **Step 5: Verify closure and release workflow**

Confirm all five issues are closed by the merged PR. Find the release workflow
run whose `head_sha` is the merge commit and wait for completion. It must be
successful; skipped, cancelled, or neutral is not delivery.

- [ ] **Step 6: Verify the published artifact**

Confirm the new patch GitHub release/tag points to the merge commit and includes
every asset required by `.github/workflows/release.yml`. Verify the package and
container publication/status checks performed by that workflow and the release
notes include the five changelog entries.

- [ ] **Step 7: Repair a failed release if necessary**

If any publication stage fails, use its logs to identify the failing boundary,
write a reproducing test/check when possible, implement only that repair, run
the complete relevant gates, open and merge a focused follow-up PR, then repeat
Steps 5–6 until the release is delivered.
