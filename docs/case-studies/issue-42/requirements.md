# Issue 42 requirement trace

| ID | Requirement | Implementation | Verification |
| --- | --- | --- | --- |
| R1 | Research existing implementations online | Pinned Claudexor/Formal AI source review plus four related routing projects in `online-research.md` | Snapshot SHAs and source links are recorded |
| R2 | Collect research under `docs/case-studies/issue-42` | This case-study package | Documentation is committed with the implementation |
| R3 | Support one subscription | Existing no-pool path remains unchanged; a one-account router is synthesized only for inspection | Full existing unit/integration suite |
| R4 | Support multiple subscriptions for every supported vendor | Provider-neutral `AccountRouter` backed by `SubscriptionReader` | Claude and Codex pool tests; shared reader/parser tests cover all providers |
| R5 | Switch automatically when an account is unavailable or spent | Automatic strategies skip capped/cooling/unreadable accounts | cap, cooldown, failover, and no-healthy-account tests |
| R6 | Identify internal limits and prefer minimum spent capacity | `ACCOUNT_REQUEST_LIMITS`; atomic usage; normalized `least-used` / `quota-first` policy | uneven-cap least-used and cap-exhaustion tests |
| R7 | Keep sessions stable | copied routing context plus TTL affinity map | repeated session selects one account |
| R8 | Do not silently change explicit/session identity | strict pin and strict bound-session selection modes | unavailable pin/session tests |
| R9 | Copy request data used for routing before translation | headers plus original JSON metadata passed separately through every translated proxy | header/body precedence and prompt-cache-key tests |
| R10 | React only to typed limit failures | 429-only cooldown, standard `Retry-After`, extend-only timers | delta/date parser and cooldown tests |
| R11 | Isolate account credentials and refresh state | cache key includes provider and stable account name | provider/account cache-isolation test |
| R12 | Enforce caller-token budgets on subscription routes | common budget enforcement before vendor selection | token budget regression coverage |
| R13 | Add Formal AI-style API namespaces | additive Anthropic, OpenAI, Codex, Qwen, Gemini, and Vertex routes | path/helper tests plus real server startup |
| R14 | Support native Gemini and Qwen APIs | native Gemini/Vertex request shapes; Qwen's native OpenAI-compatible body under its own namespace | Gemini parser/envelope tests and existing Qwen forwarding tests |
| R15 | Preserve observability | selected account on request metrics; health includes limit and remaining requests | health snapshot and metrics tests |
| R16 | Expose configuration consistently | CLI/env fields, validation, doctor output, README | config and CLI conversion tests |
| R17 | Keep code maintainable | state and request-routing extraction keep all Rust files under 1,000 lines | repository file-size check |

## Deliberate boundaries

- The router does not guess undocumented vendor quota from error text. Operators
  can configure known request caps; unknown capacity remains explicitly
  unknown. HTTP 429 and `Retry-After` are the runtime authority.
- Cross-provider fallback is not introduced. A configured pool contains one
  credential kind/provider, avoiding an invisible billing or protocol change.
- Credentials never change during an upstream request. A later unpinned request
  may select a recovered account; pinned/session work remains strict.
- Gemini native streaming is transport-compatible synthesized SSE over the
  Code Assist response, not a claim of token-level upstream streaming.
