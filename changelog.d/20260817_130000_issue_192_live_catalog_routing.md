### Changed
- **All routing now derives from live provider catalogs.** The bundled fallback catalogs, the per-provider bridge defaults, the OpenAI→Claude alias table, the static `/v1/models` listing, and the built-in client default models have been removed from production code. A catalog exists only after a successful authenticated discovery for that exact account, and is recorded with the account identity, fetch time and explicit health.
- A provider that has not completed a live discovery advertises nothing and is reported under `degraded_providers` in `GET /v1/models`. A revoked or missing credential stops exposing its models for routing while the last known catalog stays visible to administrators.
- Cross-protocol bridge models are chosen from the healthy account's live catalog under a deterministic, operator-configurable policy (`--bridge-model-policy` / `BRIDGE_MODEL_POLICY`: `first-advertised` or `last-advertised`). When no compatible model exists the request fails with `model_selection_required` instead of silently substituting a source-code constant.
- Client setup and `router with <client>` resolve the concrete model from the authenticated catalog at execution time, choosing by catalog owner rather than by a model name compiled into the router.

### Added
- A regression test suite driven entirely by synthetic model names, plus a guard that fails the build if a vendor model catalog reappears in production sources.
