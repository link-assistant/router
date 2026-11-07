# Issue 784: default geolocation privacy

Research dates: 2026-11-06–07 UTC. Issue: [#784](https://github.com/link-assistant/router/issues/784).
Delivery: [PR #785](https://github.com/link-assistant/router/pull/785).

## Requirements and evidence

The original issue, all issue comments, required sub-issues and all three PR
comment types were fetched through authenticated GitHub APIs and preserved in
[`raw/`](raw/). Each comment list and the required-sub-issue list was empty at
the initial audit and the 2026-11-07 00:07 UTC refresh. The complete refresh
receipt is [`raw/feedback-refresh.json`](raw/feedback-refresh.json). Requirements are taken
from the title and both paragraphs of the issue.

The restart audit found the implementation already published at `1e6e0b36a`,
despite the stale empty-diff notification and placeholder PR description. All
three comment types were fetched again: conversation comments contain session
summaries, while inline comments and reviews remain empty. Complete originals
are the `restart-pr-*.json` files in `raw/`. No new acceptance criterion or
required sub-issue was found.

| Requirement | Solution and verification | Status |
| --- | --- | --- |
| All tools, including Codex and Claude, default to no geolocation sharing | Common inference metadata filter, native headers, replay and JSON WebSockets; shared fixtures and HTTP regression | Supported Router metadata implemented and Node/Bun suites pass; literal all-tool guarantee remains unmet |
| Option to share location when needed | Exactly one `x-router-share-geolocation: true` header; connection scope for WebSockets; invalid/duplicate consent tests | JavaScript focused tests pass; Rust pending |
| Collect issue data in `docs/case-studies/issue-784` | GitHub JSON, requirements inventory, source register, full compressed logs and verification record | Collected; restart session summaries reviewed |
| Deep analysis with additional online facts | Primary vendor references below, forwarding root cause and client matrix | Completed research; account limits remain explicit |
| List every requirement and possible solutions/plans | This table and alternatives below | Recorded |
| Check existing components/libraries | Existing native header classifier, request decoder, WebSocket inspector and vendor controls | Reused; no new dependency |
| Execute and verify the whole solution in this PR | Focused checks, generated TypeScript, complete local gate and exact-head CI | Restart gate failed four groups; earlier CI failed; Rust and final-head qualification remain unfinished |

The literal guarantee that *every tool never shares any geolocation* cannot be
established by editing Router configuration. Source IPs are observable, providers
retain security controls, and supported tools can make direct connections. No
vendor-account authorization or account sessions were supplied for changing
dashboard settings. This part remains unmet; it is not certified by passing
metadata tests. No required child issue was discovered or deferred.

Later CI repairs retain their separate verification boundaries in
[the Clone freezer record](clone-completed-freeze.md) and
[the runtime-import source-data record](runtime-import-source-data.md).
Focused receiving checks do not complete the remaining full-gate requirements.

## Root cause and implementation

Native forwarding intentionally preserved application headers. Network-origin
headers were filtered, but location headers derived from those IPs were not.
The pre-fix regression forwarded `CF-IPCountry: GB` and `X-Vercel-IP-City: London`.
Supported web-search APIs also accept explicit user location in otherwise valid
inference bodies. Raw native replay and early forwarding of fragmented WebSocket
messages can bypass a body-only filter.

The JavaScript policy is the development source. It classifies explicit location
headers and mutates only documented API metadata containers. Authentication runs
before HTTP metadata processing. The Rust middleware uses the existing bounded
decoder and replay encoder, preserving identity/zstd encoding and original bytes
when the policy changes nothing. It runs before account routing. The native
header classifier also enforces the default. Both Responses WebSocket paths
inspect structured events; JavaScript waits for complete bounded messages before
forwarding freshly masked frames. Search remains available, and arbitrary prompt,
function-schema and metadata values named `location` remain unchanged.

Shared fixtures cover Responses, previews, Chat, Anthropic, Gemini, wrapper
requests, message batches, realtime events, malformed optional containers,
idempotence and consent. They are consumed by Node/Bun and Rust test source.
The existing three Claude process privacy defaults and all explicit user
telemetry choices remain intact, preserving the behavior fixed in
[PR #552](https://github.com/link-assistant/router/pull/552) and the broader native
contracts in [PR #704](https://github.com/link-assistant/router/pull/704).

## Client inventory and primary-source findings

These are observations about reviewed references, not proof that an undocumented
setting cannot exist. The common metadata policy requires inference traffic to
actually traverse Router. Existing unsupported client modes remain unsupported.

| Integration | Observed control and boundary |
| --- | --- |
| Codex | The [config reference](https://developers.openai.com/codex/config-reference/) documents optional `tools.web_search.location` and provider `http_headers`. Remove optional coordinates and omit the Router sharing header by default; the [configuration guide](../../privacy/geolocation.md#configure-codex-and-claude-code) shows explicit opt-in. No reviewed universal geolocation-off key. Analytics is not location consent. [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search) accepts optional tool `user_location`. |
| Claude Code | [Settings](https://code.claude.com/docs/en/settings) and [environment variables](https://code.claude.com/docs/en/env-vars) provide provider/custom header configuration. The [privacy explanation](https://privacy.claude.com/en/articles/11186740-does-claude-use-my-location) distinguishes optional coarse product location from mandatory security inference; account changes cannot be made from an offline Router setup. [Search tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) specify tool-level `user_location`. |
| Gemini CLI | [Configuration](https://geminicli.com/docs/reference/configuration/) exposes `privacy.usageStatisticsEnabled`; this controls usage reporting. [Maps grounding](https://ai.google.dev/gemini-api/docs/generate-content/maps-grounding) supports optional retrieval coordinates. Router only supports the existing isolated API-key path; subscription hijacking remains refused. |
| Qwen Code | [Terms and privacy](https://qwenlm.github.io/qwen-code-docs/en/users/support/tos-privacy/) describe optional usage statistics independently of the selected LLM provider. Those statistics are not a location-off control. Chat inference through Router receives the common policy. |
| OpenCode | [Provider configuration](https://docs.opencode.ai/docs/providers/) exposes a custom base URL; reviewed [configuration](https://docs.opencode.ai/docs/config/) does not establish a universal geolocation setting. Provider traffic through Router receives the common policy; plugins/direct providers are separate. |
| Agent | The [upstream repository](https://github.com/link-assistant/agent) describes an OpenCode-based thin agent. Router's existing custom-provider integration receives the common policy; no independently verified global location toggle. |
| Grok CLI | The [actual integrated CLI](https://github.com/superagent-ai/grok-cli) supports a configurable API base. This is distinct from the Grok consumer website. Router applies the common Chat policy; no verified universal location-off flag. |
| Cursor Agent | [Cursor's policy](https://cursor.com/privacy) describes IP-derived geography. [Privacy Mode](https://prod.cursor.com/help/security-and-privacy/privacy) concerns training/retention; it is not a geolocation switch. Router refuses its unsupported private ConnectRPC integration. No all-traffic guarantee is possible here. |

[Cloudflare's own reference](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
and [Managed Transforms reference](https://developers.cloudflare.com/rules/transform/managed-transforms/reference/#add-visitor-location-headers)
document visitor location headers, including non-IP-prefixed region, postal-code
and timezone names. Filtering only original IP headers leaves derived location
metadata exposed. The original-IPv6 and pseudo-IPv4 fields join the unconditional
network-origin filter. Test data uses synthetic
coordinates and credentials; no personal location was collected for this study.

The restart audit also checked the [ProtoJSON format contract](https://protobuf.dev/programming-guides/json/).
Its parsers accept each field's original name and lowerCamelCase alias. This
means the three Gemini retrieval path components can mix spellings independently.
The prior filter covered only two of eight combinations. Six newly reproducing
shared cases failed before the fix; all eight combinations now have body and
HTTP-forwarding coverage, including explicit consent and preserved application
content. The matching Rust implementation consumes the same fixture, but its
execution remains unrun. Primary-source observations and their limits are
recorded in [`raw/restart-research.json`](raw/restart-research.json).

## Alternatives and execution plan

| Approach | Assessment and plan |
| --- | --- |
| Set one universal environment flag | Rejected: no supported common flag was found. Invented flags create false assurance. |
| Disable telemetry wholesale | Rejected for this requirement: usage statistics and location are separate, and Claude feature evaluation can regress (#552). Preserve explicit settings. |
| Disable all web search | Rejected: loses existing functionality and does not hide transport IPs. Remove optional location metadata instead. |
| Delete every `location` key recursively | Rejected: corrupts prompts, user tools and JSON schemas. Use a bounded set of protocol containers. |
| Add an SDK or generic redaction library | Existing Router abstractions already cover headers, bounded JSON and frames. A new dependency would not discover vendor account settings or IP inference. Reuse these components and add behavioral cases. |
| Default metadata filter plus explicit opt-in | Implement and test first in JavaScript, mirror native Rust boundaries, regenerate TypeScript, run focused checks and the complete gate, then review all exact-head CI failures. |
| Vendor account settings and egress controls | Document concrete supported controls and limits. Account-level changes require the respective authenticated account; network anonymity requires separate deployment controls. These are not silently marked implemented. |

## Verification record

See [`verification.md`](verification.md). Passing focused tests is not complete
translation/parity qualification. Strict gates and same-SHA JavaScript-before-Rust
requirements remain unchanged. This PR stays unmerged while criteria remain unmet.

The [integrated Clone/runtime gate attempt](runtime-integrated-gate.md) records
the complete immutable-head local attempt, its passed stages, memory interruption,
unrun stages and fully reaped test processes.

The [runtime/freezer checkpoint](runtime-freeze-checkpoint-verification.md)
records the complete be8560a8d CI cycle, every remaining failure class and the
focused source batch's exact receiving boundaries.
