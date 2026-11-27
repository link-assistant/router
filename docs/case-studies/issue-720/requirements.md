# Requirements traced from issue #720

The issue body ([raw/issue-720.json](raw/issue-720.json)) is short but dense.
Each sentence is split into testable requirements below. "Solution" points to
[solution-plans.md](solution-plans.md); "Verification" says how we know the
requirement is met.

| ID | Requirement (source text) | Solution | Verification |
| --- | --- | --- | --- |
| R1 | "We must support all the features from CLIProxyAPI" (title) | Inventory every feature ([feature-matrix.md](feature-matrix.md)); deliver each useful one through a sub-issue; record the rest as out of scope with a reason | Every row of the matrix has a verdict and, for Gap/Partial rows, a sub-issue key |
| R2 | "use as much tests as possible from them, to reproduce all the features we care about" | Catalogue the 918 upstream test files, pick the suites whose vectors transfer ([test-reuse.md](test-reuse.md)); dedicated sub-issues D2 and P port them with attribution | Ported tests exist under `tests/` with the upstream file named in the header; sub-issues D2 and P closed |
| R3 | "make sure we reasonably expand on the scope of our goals on features that we are missing, yet will be useful for our use cases" | Prioritise gaps by relevance to `docs/use-cases/` (Claude Code, Codex, Gemini CLI, Grok CLI, opencode, Agent); mark low-value items as low priority or skip | Each sub-issue states the use case it serves; low-priority items labelled |
| R4 | "pay attention a lot to reliability" | Keep Router's timeout and failover policy (#669, #677); add model-level cooldowns, retry budgets, runtime strategy switch (I); port stream-disconnect failover tests (P) | Sub-issues I and P include failing-then-passing tests for quota failover and disconnects |
| R5 | "pay attention a lot to security" | Hardening sub-issue N blocks the new management surfaces (F, G); redaction-by-default for config reads; allow-list for header passthrough; no dynamic-library plugins; encrypted storage if K is ever built | Security section in README; N blocks F and G in GitHub; each affected sub-issue has a "Security" paragraph |
| R6 | "pay attention a lot to safety" | Preserve deny-by-default subscription bridging; do not port fingerprint mimicry; keep `UPSTREAM_ALLOW_PRIVATE_NETWORKS` guard for new providers; provider onboarding contract (B0) requires a recorded terms decision | B0 template includes a terms checklist; E states the non-goal explicitly |
| R7 | "Do deep analysis" | This folder: matrix, research, components survey, plans, test reuse | Documents present and cross-linked |
| R8 | "create issues to deliver it all" | 20 sub-issues (N, A, I, C, B0, O, H, D1, F, G, E, B1–B4, J, D2, P, K, L) | Issue numbers listed in README § 6 |
| R9 | "in issues clearly mark dependency by using GitHub blockers" | Use the GitHub issue-dependency API (`blocked_by`) for every edge in the plan | `gh api repos/link-assistant/router/issues/<n>/dependencies/blocked_by` returns the declared blockers |
| R10 | "all issues should be sub-issues of this one" | Attach each created issue with the sub-issue API | `gh api repos/link-assistant/router/issues/720/sub_issues` lists all 20 |
| R11 | "collect data related about the issue to this repository … `./docs/case-studies/issue-{id}` folder" | `docs/case-studies/issue-720/` with `raw/` captures of the MIT-licensed upstream documents and the issue JSON | Folder committed in PR #721 |
| R12 | "use it to do deep case study analysis (also make sure to search online for additional facts and data)" | [online-research.md](online-research.md): releases v8.0.11–v8.0.20, documentation mirrors, cliproxy-rs, CPAMC, ecosystem projects | Each fact has a URL and a retrieval date |
| R13 | "list of each and all requirements from the issue" | This table | — |
| R14 | "propose possible solutions and solution plans for each requirement" | [solution-plans.md](solution-plans.md) gives options and a chosen plan per requirement and per gap area | One section per key |
| R15 | "check known existing components/libraries, that solve similar problem or can help in solutions" | [components-survey.md](components-survey.md): Rust crates and sibling projects per gap area | Each gap area names at least one reusable component or states none fits |

## Implicit requirements inferred from repository conventions

| ID | Requirement | Source | Verification |
| --- | --- | --- | --- |
| I1 | Changelog fragment with `bump:` frontmatter | `changelog.d/README.md` | Fragment present in PR #721 |
| I2 | No `.rs` file above 1000 lines; no forbidden terminology outside allowed paths | `scripts/check-file-size.rs`, `scripts/check-terminology.rs` | Both scripts pass locally and in CI |
| I3 | Third-party text only under `raw/` with licence copied | Previous case studies (issue-45) | `raw/cliproxyapi-LICENSE` present |
| I4 | Do not duplicate closed work (#668–#684) | Repository history | README § 3 lists what is already done; sub-issues link to it instead of re-stating |
