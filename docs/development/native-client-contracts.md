# Native client contracts

The native client modules read all eight documented client roots. Configuration
errors remain attached to their row, so listing does not hide subsequent clients.
Status reports endpoint origins and conflicting key names without credential values.
An isolated `home` does not inherit ambient routing credentials.

Codex TOML reads use the zero-dependency ISC parser
[`@iarna/toml`](https://github.com/iarna/iarna-toml), pinned to version 3.0.0
and registry integrity in the package lock. Its installed package is 99,960 bytes;
installation used `--ignore-scripts` in the one shared dependency tree.

OpenCode-shaped and Qwen JSON setup/removal preserve foreign configuration.
Changed files receive private backups. Removal restores only unchanged owned
values; operator changes survive. OpenCode, Agent, Qwen and Grok setup provisions
exact client/principal-bound local tokens. JSON clients verify the authenticated
catalog before writing. A failed setup revokes its unused minted credential.
Supplied credentials survive ordinary removal; requested revocation completes
before the private credential files are removed.

The transaction uses the Rust client repair lock path through the shared OS lock
adapter. Private snapshots restore original bytes and modes on injected failures.
Edit fences preserve concurrent operator changes and retain the private snapshot
when automatic restoration cannot safely complete. UTF-8 file reads preserve BOM
bytes so hashing does not silently change the source. Actual mixed-runtime and
Windows behavior remain unverified.

Live catalog selection uses `/api/models`, the exact client header and the client
credential header. Every row is validated; an invalid row is never silently
dropped. Known historical selector spellings normalize and unknown spellings
provide no alias authority. Explicit Anthropic `[1m]` requests require an exact
Anthropic-owned base identity.

This subset leaves complete Claude/Codex writer ownership, remote provisioning,
cross-platform observation, global undo-state integration, lifecycle rollback,
launch isolation and every precedence combination unverified. Existing global
undo state is refused before changing configuration. All four client operations
remain partial.
