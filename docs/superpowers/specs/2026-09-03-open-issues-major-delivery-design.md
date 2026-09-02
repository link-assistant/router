# Open issues major delivery design

## Objective

Deliver issues #192, #390, #391, #392, and #393 together as one intentional breaking release.
The release must replace ambiguous HTTP namespaces, finish live catalog delivery, restore token-store
compatibility, and make client configuration ownership diagnosable and repairable without weakening
the client/subscriber policy shipped in `v0.125.4`.

## Delivery boundary

The five issues form one release boundary even though the token-store decoder is internally
independent. Route construction, client setup, managed launches, catalog discovery, repair, doctor,
and the admin UI all need the same canonical endpoints. Publishing only part of that contract would
leave generated configurations pointing at paths that another part of the release does not serve.

The implementation will therefore use one branch and one pull request with small red/green commits.
The changelog fragment will declare `bump: major`. The release pipeline chooses the concrete version;
the implementation will not hand-edit the package version.

## Route contract

Create a Router-owned `route_contract` module. It defines:

- `RouteClass::{Neutral, Management, Service(ServiceKind)}`;
- `ServiceKind` values for Anthropic, OpenAI, Codex, Qwen, Gemini, Vertex, Bedrock, GitHub, Git, and
  ActivityPub;
- authentication requirements, permitted listeners, canonical templates, and error dialect for
  each registered route;
- endpoint builders that join a saved Router origin to the correct canonical base; and
- an explicit inventory of removed paths used only for rejection tests and migration reporting.

The network router will be assembled from this registry in three modes:

1. the combined listener serves `/api/health`, all enabled service groups, and authenticated
   management routes;
2. inference-only serves `/api/health` and enabled AI service groups only; and
3. the dedicated admin listener serves the UI plus the same canonical management routes, but no
   service routes.

The GitHub CLI adapter is a separate local/private listener. It accepts GitHub CLI's fixed `/api/v3`
and `/api/graphql` paths and rewrites them to the canonical GitHub service handlers. Those fixed
paths are not registered on the combined or inference-only listener.

Every route is registered through a classified descriptor. A table-driven inventory test compares
the descriptors with every assembled listener and fails if a route is unclassified, appears on an
ineligible listener, or belongs to more than one class. Unknown and removed paths reach the local
fallback before authentication, body parsing, credential lookup, or upstream construction.

Canonical paths follow #391 exactly:

- neutral: `/api/health`;
- management: `/api/management/...`;
- Anthropic: `/api/services/anthropic/v1/...`;
- OpenAI: `/api/services/openai/v1/...`;
- Codex: `/api/services/codex/v1/...`;
- Qwen: `/api/services/qwen/v1/...`;
- Gemini: `/api/services/gemini/v1beta/...`;
- Vertex: `/api/services/vertex/v1/...`;
- Bedrock: `/api/services/bedrock/...`;
- GitHub REST/GraphQL/Git: `/api/services/github/api/v3/...`,
  `/api/services/github/api/graphql`, and `/api/services/github/git/...`; and
- ActivityPub/ForgeFed: `/api/services/activitypub/...`.

Protocol bridges remain intact. `ServiceKind` describes the caller-facing dialect, while the live
model registry and policy choose the upstream provider independently.

## Live catalog records and routing

Replace string-only catalog entries with a structured record containing the source provider,
account identity, canonical upstream ID, optional client alias, fetch time, health generation,
protocol capabilities, source order, and the complete upstream JSON object. Unknown upstream fields
are preserved rather than reconstructed. Derived Router fields are stored separately so they cannot
overwrite vendor metadata.

Provider fetchers will follow all documented pagination signals (`has_more` and cursor forms for
Anthropic/OpenAI-compatible sources, and `nextPageToken` for Google sources), using a visited-token
set and a bounded page count to fail closed on loops. A successful fetch atomically replaces only
the matching provider/account generation. Credential rejection or removal immediately hides that
generation while leaving other providers' entries available. Successful import, refresh, provider
mutation, and authoritative credential replacement invalidate or refresh the affected generation.

Catalog projection performs these operations in order:

1. retain only healthy, currently authoritative provider/account generations;
2. enforce the signed client kind, subscriber binding, provider policy, and protocol capability;
3. preserve unique canonical IDs;
4. assign deterministic, reversible provider-qualified aliases to collisions and client-specific
   aliases required by a native client; and
5. record an exact `(client_kind, exposed_id) -> (provider, account, canonical_id, protocol)` entry
   used again immediately before dispatch.

No production policy contains a closed list of commercial model names, families, or versions.
`zai_coding_plan::REVIEWED_MODELS` is removed. z.ai remains disabled without intermediary-risk
acknowledgement and remains restricted by recognized client, protocol, exact unsupported-client
override, and single-subscriber ownership. A new live GLM model is eligible because of those
properties, not because its name was compiled into Router.

Claude catalog startup requests are authorized by the signed `client_kind` and the canonical
Anthropic catalog route. An internal test header is not required. `router with claude`, permanent
setup, and repair explicitly enable gateway model discovery, remove inherited disabling settings,
clear higher-priority credentials, and avoid family/model pins unless the operator selected a
model. The launch prints a diagnostic explaining that discovery requires nonessential startup
traffic. The real client configuration remains byte-identical for `with`.

## Token-store compatibility

The associative optional-field helpers will distinguish an absent key from a malformed present
value. Missing `client_kind` and `principal_id` decode as `None`, matching records written before
`v0.125.4`; present non-string/non-null values remain errors.

Both `TextTokenStore::open` and its reload path will use one decoder-selection helper. If associative
decoding and legacy decoding both fail, the returned codec error includes both labeled causes,
with the associative failure first. No successful old format changes behavior, and an old
associative store is rewritten only when the existing migration rules already require it.

Fixtures copied from the `v0.125.3` record shape, including quoting edge cases, prove read,
mutation, and round-trip compatibility.

## Ownership analysis

Add a pure client analysis layer. Each client adapter describes its routing-critical public files,
ambient variables, Router-managed environment, ownership marker, precedence, safe origin, credential
carriers, discovery controls, static catalog references, and model pins. Analysis reads every source
without mutation and returns:

- `unconfigured` when no routing configuration exists;
- `foreign` when an external configuration controls the route;
- `managed-intact` when the effective route and marker match this Router;
- `managed-drifted` when Router owns the configuration but effective values differ; and
- `ambiguous` when invalid data, conflicting ownership, aliases, or unsafe filesystem objects make
  ownership impossible to prove.

`clients list`, `show`, and `doctor` consume the same result. `configured: true` means
`managed-intact` for the selected Router. Text and JSON output include state, source, safe URL,
conflicting key names, and recommended action, but never a credential value.

`router with` consumes the same expected/effective comparison but applies only a child-process or
isolated-profile overlay. It never repairs persistent state.

## Repair transaction

Add `clients repair <CLIENT> [--dry-run] [--json]`, `clients repair --all ...`, and
`clients repair <CLIENT> --rollback <BACKUP_ID>`.

Analysis produces a deterministic `RepairPlan` containing allowed path changes, expected hashes,
permission changes, token action, and validation action. Dry-run renders that plan and performs no
writes, token issuance/revocation, catalog/health calls, or inference calls.

For mutation:

1. reject symlinks, non-regular files, invalid config, and analyze/write hash races;
2. acquire or reuse a client-bound token according to ownership, never importing a token found in
   client configuration;
3. validate a new candidate with a documented non-inference catalog/health request;
4. create an opaque snapshot below
   `$XDG_CONFIG_HOME/link-assistant-router/repairs/<id>/` using directory mode `0700` and file mode
   `0600`, recording exact bytes, existence, original mode, and SHA-256 without secret values in
   the manifest;
5. atomically write only documented public client config and Router-owned marker/state files;
6. re-read and validate the effective public route;
7. update only the post-configure hash in an existing undo marker; and
8. revoke an obsolete Router-owned token only after the replacement route is proven.

Any failure restores every byte and permission from the snapshot and revokes only an unused
Router-minted candidate. Vendor auth stores, private third-party storage, shell startup files, model
caches, history, sessions, and unknown configuration fields are never targets.

Rollback accepts a validated opaque ID, verifies that current files still match the repair's
post-state hashes, and refuses to erase later edits. A second repair of `managed-intact` is a no-op
with no token, snapshot, write, or mtime change. `--all` returns an independent result per client and
does not let one failure conceal or roll back another client's completed transaction.

## Error handling and secrecy

- Removed/unknown network routes return local `404` for missing, invalid, client, and admin
  credentials without touching request bodies or upstream state.
- Authentication errors are rendered from the typed route dialect, never substring heuristics.
- Decoder errors identify both attempted codecs without including store contents.
- Catalog failures name provider/account state but exclude tokens and raw credential bodies.
- Repair output names keys and paths only when those paths are public configuration; it never prints
  values from credential-bearing fields.
- Backups containing credentials are private regardless of the source file's mode.

## Testing and verification

Every behavior change follows a recorded red/green cycle. The acceptance suite includes:

- `v0.125.3` token-store fixtures with absent binding fields and dual-decoder diagnostics;
- a complete classified route inventory, canonical positive flows, rejected legacy paths with four
  credential states, inference-only/admin separation, and zero body/upstream work on `404`;
- all supported buffered, SSE, token-counting, tool-call, Gemini/Vertex, Bedrock, GitHub, Git, and
  ActivityPub flows on canonical paths;
- synthetic future catalog records with unknown metadata, multiple pages, duplicate canonical IDs,
  provider collisions, health transitions, import invalidation, and exact upstream restoration;
- a captured Claude Code startup catalog request without private headers, mixed Claude/z.ai
  discovery, cache/restart behavior, and managed discovery environment precedence;
- isolated homes containing the exact documented third-party Claude, Codex, and OpenCode shapes plus
  arbitrary Qwen drift;
- dry-run purity, private snapshots, vendor-store immutability, token validation ordering, injected
  failure between every write, symlink/race refusal, idempotency, independent `--all`, and rollback
  conflict refusal; and
- secret scanning of text, JSON, and error output.

Before merge, run formatting, Clippy with warnings denied, all-target checks, rustdoc warnings,
complete tests, clean instrumented coverage, RustSec/npm audits, reproducible UI build, release
contract tests, package/release builds, and a final issue audit. After merge, monitor the major
release through crates.io, GitHub assets/checksums/SBOM/attestations, and the public multi-platform
container manifest. A failed release is repaired by a focused follow-up pull request.

## Migration and coordinated rollout

The changelog and migration guide provide a complete old-to-new route table, state that no network
compatibility aliases remain, and instruct operators to rerun managed client setup or repair.
Provider credentials and subscription authorization are not rewritten.

Router will ship deploy templates and probe examples using the canonical paths. The Evirma
orchestrator is a separate repository and cannot be changed by this Router pull request; delivery
therefore exposes a candidate-validation contract and records Evirma as a coordinated downstream
rollout gate. Router is not declared deployed to Evirma until that repository consumes the released
major version and passes its candidate probes before switching the running container.
