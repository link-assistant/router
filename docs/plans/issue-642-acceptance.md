# Requirement-by-requirement implementation and evidence

The IDs below refer to the numbered requirements in [the issue 642 analysis](issue-642.md).
That analysis retains the full wording, primary research sources and the reasons
for choosing existing Router coordination over another lifecycle framework.
All changes belong to [PR 643](https://github.com/link-assistant/router/pull/643).
An acceptance plan is not a passing result: protected live, affected-host and
publication experiments remain unproven until their stated prerequisites exist.

## Claude selection: 634

| ID | Options and chosen solution | Implementation and verification plan |
| --- | --- | --- |
| 634.1 | Fixed pin, provider ranking, or catalog preference; choose conditional preference. | `clients/catalog.rs` selects advertised GLM-5.3 for a fresh z.ai-only profile; selector and real-client default regressions check the outbound request. |
| 634.2 | Rewrite every profile or track ownership; choose ownership. | `clients.rs` and `clients/analysis.rs` retain saved choices and user model keys; setup/doctor and real Claude saved-FlashX tests check repeated repair. |
| 634.3 | Force the z.ai flagship or retain native discovery; choose native mixed-provider discovery. | Native Anthropic selectors remain valid with Anthropic authority; mixed catalogs are covered by setup and entitlement fixtures. |
| 634.4 | Global inventory or per-token discovery; choose the authorized live catalog. | Catalog filtering and withdrawn-saved-model refusal prevent manufactured rows; synthetic catalogs exercise changed authority. |
| 634.5 | Silent inference retry or explicit discovery fallback; choose the latter. | Missing flagship uses existing advertised ranking; a request failure remains attached to its selected model. Real-client HTTP-failure and withdrawal scenarios check both boundaries. |
| 634.6 | Explicit-model smoke only or a selection matrix; choose the matrix. | `real_clients/claude_default.rs` and existing real-client cases cover fresh, mixed, saved, explicit, changed-catalog and failed-request behavior. Paid outage evidence needs a protected subscription. |
| 634.7 | Picker text or native request/result identity; require both request and response evidence. | Real-client fixtures inspect exact conversation requests and nonempty successful native results; auxiliary requests are checked separately. |
| 634.8 | Change only setup or share the selector and ownership rules; choose shared rules. | Setup, doctor, launch wrappers, Default and subagent fixtures use the same catalog/selection contracts; active-profile guards retain session ownership. |

## Staging: 635

| ID | Options and chosen solution | Implementation and verification plan |
| --- | --- | --- |
| 635.1 | Compose project, VM, or existing coordinator namespace; choose namespaced coordination. | `deploy_local/staging.rs` assigns a UUID journal, owner labels, separate root/port/network, secret, bound token and private client home; lifecycle tests inspect all arguments. |
| 635.2 | Switch the global target or explicitly select an isolated endpoint; choose explicit selection. | Staging commands do not invoke global profile selection or primary lifecycle operations; protected acceptance compares the selected-server state. |
| 635.3 | Copy OAuth or use separate static authority; choose an explicit staging static key. | No primary OAuth home is mounted. Missing Keychain/live evidence stays not proven in the JSON report. |
| 635.4 | Health smoke or a stream-spanning real-client experiment; provide the experiment. | `staging_live_test.rs`, via `verify-contracts --area staging`, spans stage creation with a GLM stream, Claude flagship/Flash requests, picker and isolated logs. Requires disposable Docker and an inference opt-in. |
| 635.5 | Assume separate paths imply continuity or compare primary state; choose comparisons. | The protected experiment retains token/secret/profile/session/catalog observations before and after stage creation/removal and checks stream progress. This paid acceptance has not run locally. |
| 635.6 | Best-effort recovery or ownership/pending-work refusal; choose refusal. | Lifecycle fixtures cover collisions, failed starts, interruption journals, competing operation locks and read-only status. |
| 635.7 | Downstream shell recipes or a Router entry point; provide the entry point. | `deploy --staging NAME --verify --json` and the reusable staging acceptance area produce structured evidence. Black-box CLI tests check actual parsing and absent/read-only behavior. |
| 635.8 | A single health bit or separate serving/control/ownership results; choose separate results. | Bounded process/HTTP helpers expose each result independently; a healthy socket with failed Docker management is a unit regression. |
| 635.9 | Treat saved bindings as listeners or inspect running ownership and bindability; choose both active checks. | Docker listener discovery plus a host bind check refuses collisions without starting stopped legacy containers; existing deployment ownership tests remain. |
| 635.10 | Global cleanup or exact owner/name checks; choose exact checks. | Removal checks journal ownership for containers/networks and retains data. Tests reject foreign networks, primary names and pre-existing roots. |
| 635.11 | Automatically clear pending work or refuse another owner; choose refusal. | Nonblocking namespace locks and immutable journal checks report pending/drifted state without adopting unrelated resources. |
| 635.12 | Names alone, host reservation, or explicit caps plus measured acceptance; choose caps plus honest acceptance. | CPU/memory/swap/PID/log/tmpfs caps and a 1 GiB disk floor are enforced. Capacity fixtures cover low/unknown values; the real stream experiment is required to prove non-interference. |
| 635.13 | Restart Desktop/global cleanup or bounded diagnostics with targeted cleanup; choose targeted cleanup. | Stalled-control, ownership and pending-work fixtures validate refusal; protected primary-stream checks remain unproven without the disposable host. The original incident cause is not inferred. |

## Active-profile process fixture: 636

| ID | Options and chosen solution | Implementation and verification plan |
| --- | --- | --- |
| 636.1 | Copy/sign an Apple executable, use an interpreter, or compile a fixture; compile the fixture. | `tests/fixtures/process/idle.rs` supplies a real executable under the expected vendor name, with a private environment. |
| 636.2 | Wait for `pgrep` timeout or inspect child exit immediately; choose immediate inspection. | The active-profile test reports child status and `ps` evidence; an exit-17 fixture checks the failure diagnostic. |
| 636.3 | Infer liveness from a name or verify executable/environment visibility; require visibility. | `clients_active_profile_test.rs` checks process name/HOME and backup/reset/restore refusal. macOS CI repeats serial/parallel cases; affected-workstation evidence remains unavailable. |
| 636.4 | Block all clients or compare profile ownership; choose profile ownership. | An unrelated process/profile fixture verifies another profile remains usable. |
| 636.5 | Skip the fixture or retain full test coverage; retain it. | Full all-feature suites and ten extra active-profile repetitions run in macOS CI. The portable-fixture fix is distinct from production credential lifecycle behavior. |

## Entitlement evidence: 637

| ID | Options and chosen solution | Implementation and verification plan |
| --- | --- | --- |
| 637.1 | Rename the mock area, make it paid, or split areas; split them. | `verify-contracts.rs` exposes `anthropic-mock-contracts` and credentialed `anthropic-entitlements` independently. |
| 637.2 | Silent success on missing credentials or explicit unavailable evidence; choose explicit evidence. | Shared tier helpers and verifier preparation record missing prerequisites as skipped/not proven, retaining parity false. |
| 637.3 | Prove one provider or check the union/picker; check both providers. | `mixed_entitlements_live_test.rs` checks the authorized mixed catalog and actual Claude picker against an explicitly safe endpoint. Requires protected credentials. |
| 637.4 | Metadata-only proof or exact successful inference; require inference. | The live mixed-provider test checks exact native result identity and success markers for both providers. It requires explicit paid-inference authorization. |
| 637.5 | Print credential diagnostics or redact at the boundary; redact. | Credentials and bearer tokens remain environment inputs; reports expose selectors/statuses rather than credential or provider-response bodies. Refusal tests check secret redaction. |
| 637.6 | Aggregate mock pass counts or require every live claim; require every claim. | Preparation-only, filtered, skipped or incomplete live reports cannot become top-level parity proof. Verifier decision tests cover this distinction. |

## Credential-store boundary and process cancellation: 638

| ID | Options and chosen solution | Implementation and verification plan |
| --- | --- | --- |
| 638.1 | HOME-only isolation or an OS credential-store boundary; require the OS boundary. | `verification_client::safety` refuses native macOS vendor execution; no environment opt-out bypasses it. |
| 638.2 | Guess the culprit or correlate one fixture in a disposable account/VM; require correlation. | The affected-host investigation needs the Keychain-only login, dialog timing and process tree. Those prerequisites were unavailable; no vendor is named as the culprit. |
| 638.3 | Run against the workstation login or refuse unsafe access; refuse. | Every reusable vendor helper gates before launch, clears inherited credentials and uses private state; native Mac is refused before any vendor call. |
| 638.4 | Guard inference only or share the guard across calls; share it. | Version discovery, doctor, TUI, live/host fixtures and cleanup helpers use the common boundary and bounded ownership paths. |
| 638.5 | File-name observations or before/after GUI/store evidence; require actual evidence. | No-GUI/default/search-list assertions need a validated disposable macOS environment; current reports explicitly do not claim that experiment ran. |
| 638.6 | Allow an unsafe fallback or fail closed; fail closed. | A safety refusal happens before discovery/compilation-dependent vendor execution and produces not-proven preparation evidence. |
| 638.7 | Kill only the leader or own descendants; own Unix groups and Windows diagnostic jobs. | `bounded_process.rs`, Unix PTY cleanup and finite descendant regressions test cancellation. Windows polling/reaping avoids completion-port waits; fast-exit and descendant tests have a bounded native runner. Windows PTY evidence remains unproven. |
| 638.8 | Infer credential deletion from a dialog or keep observations distinct; keep them distinct. | Analysis/reporting separates store names/file presence from credential validity and byte preservation, and leaves incident attribution unknown. |

## Release delivery: 639

| ID | Options and chosen solution | Implementation and verification plan |
| --- | --- | --- |
| 639.1 | Infer delivery from the PR or inspect exact main SHA/timestamps; inspect exact source. | Read-only research and `check-delivery.rs` distinguish the #633 merge SHA, PR checks and release-capable main runs. Token suppression is a possible mechanism, not a diagnosed actor. |
| 639.2 | One green bit or four delivery states; provide four states. | JSON separates merged source, validated candidate, partial publication and delivered release; script decision tests cover transitions. |
| 639.3 | Ignore absent triggers or fail an independent observer; fail the observer. | The read-only scheduled/manual delivery workflow checks workflow state and exact-source main checks, publishing actionable JSON. |
| 639.4 | Overwrite/re-bump or reuse publication identity; reuse identity. | Explicit `release_mode=recover` retains existing version/tag/assets/manifests and adds missing assets only. Recovery and upload tests check identity preservation. |
| 639.5 | Change repository credentials or provide a disposable acceptance matrix; provide the matrix. | Mocked decisions cover missing/failed/partial states. Human/token/App merges and registry interruption cases require a separate protected acceptance repository; no release was dispatched to acquire evidence. |
| 639.6 | Trust mutable tags or verify immutable provenance; verify provenance. | Delivery checks ancestry, source revision, version, four-platform binaries/SBOM/checksums, native versions and immutable image digest/platforms. Without artifact verification, delivery is not reported. |
| 639.7 | Publish to make checks green or retain read-only observation; retain observation. | The observer never dispatches or publishes. Recovery is an explicit reviewed workflow action, not an automatic effect of checking delivery. |

## Authorization and state preservation: 640

| ID | Options and chosen solution | Implementation and verification plan |
| --- | --- | --- |
| 640.1 | Copy all authority/state or retain original authority and checkpoint recoverable data; choose retention/checkpoints. | Local/host/remote paths retain original provider homes, signing identity and durable state. Bounded non-OAuth checkpoints cover logical tokens, encrypted static providers and registered project/session/request data. OS credential restoration is not claimed. |
| 640.2 | Health-only cutover or source/per-token comparisons; require comparisons. | Local preservation, host migration and remote agent checks compare original sources, signed tokens and each usable authorized catalog before cutover. |
| 640.3 | Implicit force bypass or distinct access-loss authorization; separate permissions. | Generic force does not bypass authority/data refusal; `--accept-access-loss` explicitly reports the accepted loss and cannot bypass failed checkpoints. |
| 640.4 | One candidate token or every usable original token; check every original token. | Original signing identity reconstructs bounded token probes; candidate catalog subsets preserve owner/model identity. Mixed-loss and oversized-inventory regressions check refusal before preparation. |
| 640.5 | Snapshot OAuth or exclude rotating credentials; exclude them. | Checkpoints exclude OAuth/OS stores/refresh state, retain one original refresh authority and describe per-file/logical consistency without a global snapshot claim. |
| 640.6 | Destructive replacement or candidate validation with retained rollback; retain rollback. | Checkpoint failure refuses before candidate work; failed candidate/cutover tests retain old backend/pointer/data. Actual remote interruption needs a disposable remote acceptance environment. |
| 640.7 | Replacement-only restore or additive default with explicit replacement; preserve both. | Offline restore keeps a pre-restore checkpoint, current records/revocations win additive merges, and empty replacement clears both token projections. Restore regressions check all three. |
| 640.8 | Patch local Docker only or share the contract across deployment paths; cover all paths. | `deploy_local/preservation.rs`, `host_migrate.rs`, `host_runtime.rs`, `deployment_preservation.rs` and `deploy/remote_agent.sh` apply the same authority/state policy. |
| 640.9 | A happy-path fixture or failure/identity matrices; provide matrices. | Tests cover changed roots/mounts, empty authority, symlinks/special files, secret identity, legacy state, revocations, budgets, native nested-path capture/restore and interrupted cutover. Protected OS-store/refresh evidence remains unavailable. |
| 640.10 | Compare health only or assert retained records/access/ownership; assert retained state. | Checkpoint/restore, no-op, sharing, active-profile and saved-choice regressions check record integrity and ownership; remote payload experiments execute the actual bounded exporter. Full live single-refresh ownership is not inferred from mocks. |

## Version preparation: 641

| ID | Options and chosen solution | Implementation and verification plan |
| --- | --- | --- |
| 641.1 | Compile first, use a Cargo build hook, or prepare before Cargo; prepare first. | `verification_client::prepare` discovers relevant installed clients in a private environment before the verifier invokes Cargo. |
| 641.2 | Replace caller pins or check agreement; check agreement. | Expected/observed values appear in the preparation report; mismatches refuse instead of downgrading or silently replacing expectations. |
| 641.3 | Separate shell probes or one entry point; use one entry point. | Standalone, pinned/newer real-client CI, live and staging areas share preparation for Claude/Codex/OpenCode and their compile-time expectations. |
| 641.4 | Treat discovery errors as compatibility success/failure or report preparation separately; separate them. | Missing/unsafe discovery is not proven, invalid/time-limited discovery fails preparation, and protocol fixtures run only after preparation succeeds. |
| 641.5 | Only pinned binaries or version/cache experiments; retain both. | `prepare-clients.py` covers newer releases, matching/mismatched pins, malformed/empty/missing output and an environment-sensitive cached Cargo fixture. |
| 641.6 | Weaken behavioral checks or run the same checks with selected expectations; retain behavioral checks. | Pinned and newer CI jobs keep native protocol/request/result/picker assertions through the common verifier. |
| 641.7 | Discover before isolation or validate safety first; validate safety first. | Native macOS refuses even `--version`; private environments strip inherited credentials, paths, IPC addresses and proxies. Shared preparation tests inspect those values. |
| 641.8 | Require undocumented exports or document runner plus fallback; document both. | `docs/testing-tiers.md` describes the preparation entry point, manual compile-time variables and the difference between preparation and compatibility evidence. |

The parent issue additionally requires one implementation PR, all eight subissue
fixes, full scope across the codebase and explicit evidence limits. PR 643 retains
all nine closing references, a minor changelog trigger, reusable experiments,
production-path guards and exact-revision CI. Its readiness depends on the final
SHA passing available checks; it does not turn unavailable paid/affected-host/
publication acceptance into completed evidence.
