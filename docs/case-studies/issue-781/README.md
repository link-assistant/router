# Issue 781 — Sensitive data in provider requests

[Issue #781](https://github.com/link-assistant/router/issues/781) requests an
optional privacy layer over Router's existing inference paths, reversible
typed placeholders for personal data within an AI session, a full comparison
with `ai-proxy`, and upstream reports for sanitizer gaps. It had no issue
comments or listed sub-issues at intake on 2026-11-18. The prepared
[PR #794](https://github.com/link-assistant/router/pull/794) had no conversation
comments, inline comments or reviews at intake.

## Requirements and execution

| Requirement | Options considered | Implementation and evidence |
| --- | --- | --- |
| Protect provider-bound sensitive information using an optional add-on | Embed all detector logic in both runtimes, run an external proxy, or use a local detector behind Router's authenticated route boundary. | The local adapter uses the published sanitizer and leaves routing, account selection and retries with Router. Enable it on each Router instance through environment config. [Operator guide](../../privacy/sensitive-data.md) |
| Disabled by default | Per-request toggle, deployment-wide opt-in, or always on with exclusions. | Deployment-level opt-in is explicit. Existing unprotected request handling is the default. Cover the default and configured failures in the native server fixture. |
| Typed placeholders and restoration in the same AI session | Request-local map, durable encrypted vault, or bounded in-memory map keyed by Router caller and session. | Session maps preserve repeated mentions and isolate caller credentials. External markers have a random per-session namespace and type such as `Person_1` or `Company_1`. Credentials receive irreversible redaction under the default detector policy. Test stable references, session isolation, unknown tokens and escaping. |
| Review all mandatory and optional ai-proxy capabilities | Compare configuration name-for-name or compare the behavior of each boundary. | The complete source comparison is below. Missing features remain explicit with their integration path and evidence needed. |
| Report sanitizer gaps, bugs and missing competitors | Add local workarounds silently or report source-backed problems in the library tracker. | Reports cover [comparison omissions](https://github.com/link-foundation/sensitive-data-sanitizer/issues/214), [contradictory verification documentation](https://github.com/link-foundation/sensitive-data-sanitizer/issues/215), [bounded live restoration](https://github.com/link-foundation/sensitive-data-sanitizer/issues/216) and [optional semantic detector adapters](https://github.com/link-foundation/sensitive-data-sanitizer/issues/217). |
| Preserve research, complete requirements, design options and a plan in this PR | Issue comments or a repository case study. | This inventory, the pinned source notes and the operator guide live with the implementation. |

## Source comparison

Reviewed the [ai-proxy README, feature list and configuration](https://github.com/lee-to/ai-proxy/blob/68bd496cbcd27d4103721f030fc84390b8f97bce/README.md)
and the [sanitizer API](https://github.com/link-foundation/sensitive-data-sanitizer/blob/13314da571482e68976d89ff2c8f06ed30839b71/docs/API.md)
and [comparison](https://github.com/link-foundation/sensitive-data-sanitizer/blob/13314da571482e68976d89ff2c8f06ed30839b71/docs/COMPARISON.md).
The adapter targets [sanitizer v0.23.0](https://github.com/link-foundation/sensitive-data-sanitizer/tree/445778f0090b88ac4ec8df55e7554deff359c687).
The audit is a source comparison, with fixture and workflow evidence to be
recorded separately.

| ai-proxy capability | Router status and plan |
| --- | --- |
| Regex, entropy and structural secret scanning, including JWTs, dotenv and connection strings | The sanitizer supplies provider and contextual rules, structural/encoded checks, Secretlint and entropy heuristics. The `paranoid` policy enables additional entropy heuristics. Add parity fixtures for each adversarial encoding and rule class before claiming equivalent detection. |
| Partial mask, prefix/suffix controls and typed placeholders | The default add-on uses typed personal placeholders and complete credential redaction. The library exposes partial per-type masking through the optional policy. Exact ai-proxy prefix/suffix behavior for credentials is a policy gap. A dedicated opt-in strategy would need synthetic short/long credential tests and explicit documentation of retained fragments. |
| Response restoration toggle and category allowlist | The scanner supports a response-only restoration toggle and an allowlist of restorable placeholder types. Outbound masking uses the same policy for both settings. The fixture checks that disabled categories remain pseudonymized in client responses. |
| Body or full scan with header exceptions | Supported. Full mode inspects eligible header and query values. Router authentication and transport controls retain their existing behavior. Arbitrary header exemption lists would need tests for defaults and operator trust boundaries. |
| Local OpenAI-compatible model with hybrid, direct, verify-only and fail-policy modes | The local model adapter combines deterministic and semantic results with byte-offset normalization, confidence checks and explicit failure policy. Model-only detection and model-assisted filtering of deterministic findings are gaps. Establish whether suppressing deterministic findings is acceptable before adding a policy that permits it. Upstream [#217](https://github.com/link-foundation/sensitive-data-sanitizer/issues/217) tracks model adapters. |
| OpenAI Privacy Filter HTTP, CLI and Docker wrapper | The optional adapter accepts loopback HTTP and local OPF-compatible CLI reports. An installed wrapper can provide Docker execution. Router does not bundle a model, container or wrapper. Stub cases cover report normalization and failure policy. A live OPF qualification needs a pinned model and executable on the CI runner. Upstream [#217](https://github.com/link-foundation/sensitive-data-sanitizer/issues/217) covers this integration. |
| Streaming with chunk-boundary restoration and compressed responses | JSON/SSE restoration handles actual wire chunks. A bounded window joins text deltas within the same output for Responses, Chat Completions, Anthropic and Gemini SSE events. Encoded responses can pass through without transformation. Fixtures cover physical chunks, interleaved deltas and incomplete markers. |
| Anthropic and OpenAI/Codex API and subscription routing, including compact | The scanner is ahead of existing Router routing. Native provider links and credentials keep their existing ownership contracts. Validate vendor envelope retention with credential-free stubs before deployment, then run the separate live credentialed tier when available. |
| HTTPS CONNECT blind forwarding and host-allowlisted CA MITM | Router's protection covers clients configured to use its API listeners. It does not implement a general outgoing CONNECT proxy or `included_hosts`/`excluded_hosts` MITM filters. A reviewed ingress adapter would need explicit managed certificate trust, tunneling vs denial rules, canonical host matching and independent protocol fixtures. |
| WebSocket inspect, passthrough and reject modes | The add-on scans supported text frames and restores downstream text. Opaque client frames are refused when enabled. Disabled mode retains Router's native relay. Intermediate forwarding without scanning would require a separate policy that declares the exposure. |
| Bounded request gzip and zstd normalization | Gzip and bounded Rust zstd decoding are implemented. The JavaScript zstd path needs runtime support. Existing Node 20 deployments refuse unsupported compression. Test both decoded-size and wire-size limits. |
| Global rate limiter and egress connect/request deadlines | Router already has token-scoped limits and upstream deadlines. The scanner has a bounded concurrency gate and 10-second deadline. A global token bucket equivalent to ai-proxy is absent. A listener-wide limit would need retry, long-stream and multi-tenant fairness tests. |
| Runtime environment controls | Environment config selects the scanner, scope, port, token and detector policy. Router's existing configuration controls upstreams and logging. The two projects expose different option sets. |
| Structured audit and redaction events | Router has request logging, per-token audit and metrics. The scanner uses value-free errors. It does not emit ai-proxy-style per-match type/confidence/offset events. A metadata-only diagnostic interface should have assertions that values and maps are absent. |
| Loopback dashboard, SQLite retention, token usage, tool markers and opt-in sanitized previews | Router has an authenticated admin console and separate request logs and metrics. It does not supply the same SQLite dashboard/preview pipeline. A dashboard adapter would require separate retention, masking, authentication and deletion tests. |

## Related implementations and trade-offs

- Presidio supports local analyzer/anonymizer services and deanonymization
  operators. It can extend detection, with a separate runtime/model to deploy
  and evaluate for languages and formats the default detector misses.
  [Presidio Anonymizer](https://presidio.dataprivacystack.org/anonymizer/)
- LiteLLM documents optional output rehydration and a separate Shield service
  with a local vault and incremental rehydration. A gateway hop would duplicate
  parts of Router's routing and add an operational dependency.
  [LiteLLM Presidio integration](https://docs.litellm.ai/docs/proxy/guardrails/pii_masking_v2#output-parsing),
  [LLM Shield integration](https://docs.litellm.ai/docs/proxy/guardrails/llm_shield_proxy)
- Token-proxy documents expiring in-memory maps and Anthropic SSE rehydration.
  CloakPipe documents encrypted storage, and piast-gate documents Polish NER
  and limited stream scanning. Their protocol and detector coverage differ.
  [Token-proxy](https://github.com/zolderio/token-proxy#streaming-support),
  [CloakPipe](https://github.com/rohansx/cloakpipe),
  [piast-gate](https://github.com/vissnia/piast-gate)
- NIST recommends assessing PII sensitivity in context and protecting it
  against inappropriate access, use and disclosure. The restore map and
  restored outputs are inside that boundary.
  [NIST SP 800-122](https://csrc.nist.gov/pubs/sp/800/122/final)

## Verification ledger

- JavaScript fixture source covers default behavior, bounded gzip JSON,
  application headers and URL queries, irreversible secrets, stable and
  isolated session maps, fail-closed responses, SSE rechunking and WebSocket
  inspection/restoration. It is wired into the normal Node and Bun server
  test entry point.
- The first published checkpoint, `e5f873a28e3a620d29d302e58b07e9178ea33719`,
  passed the four active JavaScript gates and Ubuntu Rust tests. Formatting,
  macOS and coverage failed, and the dependency audit surfaced a maintenance
  advisory on the existing `chrono` dependency. Measured coverage was 87.39%
  against the 87.578120% baseline. [CI run](https://github.com/link-assistant/router/actions/runs/44252987395)
- The follow-up adds cases for independent SSE text lanes, restoration types,
  local model and OPF HTTP adapter reports, gzip expansion, zstd and opaque
  request refusal, malformed scanner output, and masking on both native
  Rust WebSocket relays. [Follow-up CI](https://github.com/link-assistant/router/actions/runs/44257371379)
- The published package smoke test loads the pinned sanitizer with real
  detection rules, sends synthetic names through the loopback request boundary
  and asserts stable person and company markers, irreversible credentials and
  caller/session isolation in an echoed response.
- The follow-up's Rust dependency audit passed. The admin UI audit then
  surfaced an unpatched advisory against the base branch's build-only
  `picomatch@4.0.7` dependency. The audit still runs at high severity.
  PR #794 can proceed only when the advisory and affected development
  dependency paths match the checked exception. The default-branch check
  directs the maintainer to update the lockfile when a patch is available.
  [Advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
- Local tests and compilation remain unrun under the repository instructions.
  The manual development lane runs four JavaScript gates before Rust CI.
  Strict translation freshness and parity are unverified. Live vendor and
  OPF behavior require separate runtime evidence.
