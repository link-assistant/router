# Requirement Inventory for Issue #7

This file turns the free-form issue body into an actionable requirement list.

Legend:

- `MUST`: directly stated in the issue or required to satisfy the issue's stated goal
- `SHOULD`: strongly implied by the issue or by the named comparison targets
- `EXP`: useful, but should stay optional or experimental because it depends on undocumented behavior

## Requirements

| ID | Priority | Requirement | Source in issue | Notes |
| --- | --- | --- | --- | --- |
| R1 | MUST | Research every repository linked in issue #7 and compare them with this repo | "double check all these codebases and compare with our codebase" | Satisfied by the fetched repo snapshots in `raw/` plus the comparison notes |
| R2 | MUST | Store the resulting research under `docs/case-studies/issue-7` | "make sure we compile that data to `./docs/case-studies/issue-{id}` folder" | Satisfied by this case-study directory |
| R3 | MUST | Keep the project Rust-first and preserve library + CLI + server + Docker packaging | "keep our rust implementation as library/cli + server/docker image" | This argues against replacing the project with a Node-centric architecture |
| R4 | MUST | Replace the current config story with `lino-arguments` | "router can be easily configured using latest ... lino-arguments" | Should cover CLI args, env vars, and config file overrides |
| R5 | MUST | Persist token data in a human-readable text store using `lino-objects-codec` | "database of tokens ... stored using ... lino-objects-codec (text storage)" | A storage abstraction is required so this does not leak into every handler |
| R6 | MUST | Persist token data in a binary store using `link-cli` | "and ... link-cli (binary storage)" | This likely needs an adapter layer rather than direct handler-level shelling |
| R7 | MUST | Enable both storage types by default | "We should support by default both storage types turned on" | Needs startup consistency checks and reconciliation strategy |
| R8 | MUST | Support full token lifecycle management | "issue tokens or expire tokens, and support all the flow" | Minimum surface: issue, validate, list, revoke, expire |
| R9 | MUST | Keep a direct proxy mode that does not reimplement the API surface beyond auth substitution | "direct proxy (no reimplementation of API), with only substitution for oAuth token" | This is the current repository's strongest mode |
| R10 | MUST | Support OpenAI-compatible APIs in addition to direct proxying | "support OpenAI compatible completions and responses" | This implies at least Chat Completions and Responses API |
| R11 | SHOULD | Support other popular API styles used by the comparison set | "other popular API styles like in previously mentioned projects" | Could include models, capabilities, and compatibility helper routes |
| R12 | MUST | Make the routing mode configurable so operators can switch between proxy strategies | "we can switch between them and all of them are configurable" | Best implemented as `direct`, `cli`, and `hybrid` modes |
| R13 | SHOULD | Reach feature parity with the strongest ideas from the comparison set where practical | "support all the features they have" | Should be interpreted as a roadmap, not one unsafe code path |
| R14 | SHOULD | Add usage tracking, quotas, or routing policies comparable to mature gateway products | "closer to capabilities of OpenRouter" | OpenRouter-style routing and observability are a product benchmark, not a literal clone requirement |
| R15 | SHOULD | Add model discovery and model aliasing | implied by comparison targets and OpenRouter-like goals | `/v1/models` is a recurring expectation |
| R16 | SHOULD | Add operational endpoints and observability | implied by comparison targets and OpenRouter-like goals | `/health`, `/metrics`, usage endpoints, logs, and later dashboard surface |
| R17 | SHOULD | Base Docker and deployment workflow on `link-foundation/box` | "server/docker image based on ... box, rust version" | Current Dockerfile does not do this yet |
| R18 | EXP | Add compatibility hacks for tool support over direct OAuth only if explicitly enabled | implied by certain community repos, not by Anthropic docs | Examples: spoofing, XML history reconstruction, injected Claude Code identity prompts |

## Acceptance Signals

The issue should be considered well-covered when the repository has:

- a stable case-study package under `docs/case-studies/issue-7`
- a written roadmap that separates stable, documented behavior from experimental compatibility hacks
- a config migration plan for `lino-arguments`
- a storage plan for dual text + binary token persistence
- a clear architecture for both direct gateway mode and OpenAI-compatible mode

## Non-Goals For The First Implementation Pass

These items should not block the first implementation pass:

- reproducing every undocumented workaround from community projects
- building a full OpenRouter clone in one pull request
- introducing silent fallbacks that change model or backend behavior without operator control

The first implementation pass should prioritize correctness, persistence, and explicit configuration.
