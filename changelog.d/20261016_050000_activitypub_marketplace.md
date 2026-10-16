---
bump: major
---

### Added
- Publish caller-visible model services as FEP-0837 Proposal/Intent objects and negotiate Offer(Agreement) requests with finalized commitments and links to the authenticated inference API.

### Changed
- The ActivityPub inbox validates marketplace agreements instead of accepting arbitrary activities. Outbox and inbox now require the same credentials and catalog entitlements as inference.
- Upgrade quinn-proto and rustls to patched releases to resolve the dependency audit failures on the issue branch.

### Removed
- Remove the legacy Gonka and Crater/ForgeFed providers, flags, environment configuration, actor aliases and problemsets Follow activity. Use the normal inference providers and ActivityPub marketplace; generic brokers can migrate to OpenAI-compatible provider configuration.
