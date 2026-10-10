# Shared pipeline and agent-policy proposals

These additive proposals were published as draft pull requests for
[Router issue759](https://github.com/link-assistant/router/issues/759):

| Repository | Existing issue | Public draft pull request | Local proposed patch |
| --- | --- | --- | --- |
| Rust pipeline template | [196](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/196) | [197](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/pull/197) | [patch](rust-ai-driven-development-pipeline-template.patch) |
| JavaScript pipeline template | [230](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/230) | [231](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/pull/231) | [patch](js-ai-driven-development-pipeline-template.patch) |
| Hive Mind | [3043](https://github.com/link-assistant/hive-mind/issues/3043) | [3044](https://github.com/link-assistant/hive-mind/pull/3044) | [patch](hive-mind.patch) |

Publication makes the proposals reviewable; it does not complete project-specific
adoption. The template workflows require implemented native JavaScript checks, a
strict complete-feature parity inventory and deterministic regeneration checks
from callers. They require an immutable source SHA, validate checkout identity
before and after checks, and expose the successfully tested SHA. Every Rust job
must depend on that gate and check out its tested revision. The Rust-only template
sample still requires a complete native JavaScript port for production adoption.

The publisher used `[skip ci]` on these draft proposal commits to avoid launching
the legacy ungated Rust workflows while adding an opt-in gate. Remote CI was not
claimed green. Both proposed callable workflows pass local actionlint; all three
patches pass git apply --check against immutable captured bases and delete zero
upstream document lines. These checks validate proposal structure, not repository
adoption or whole Router parity.

[publication.json](publication.json) records exact publisher base/head SHAs, public
PR URLs, the publication metadata file hash, API snapshot hashes and hashes of all
nine small published source files. [source-pins.json](source-pins.json) records the
audited bases. Exact filed issue metadata/bodies, first100 comments, PR metadata
and file lists are captured under
[raw/sources/upstream-proposals](../raw/sources/upstream-proposals/).
