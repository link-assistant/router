# Local client profile lifecycle

`router clients` manages local profiles for Codex, Claude Code, Cursor Agent,
Gemini CLI, Grok CLI, OpenCode, Qwen Code and Link.Assistant Agent. Operations
never contact a Router server. A *normal* profile belongs to the client user;
*router* means a persistent home owned by Router. Only Claude and Gemini have
the latter. Project-local settings are outside this command's scope.

## Back up and restore

```sh
router clients backup create claude --profile both
router clients backup create --all --destination "$HOME/Data/client-backups"
router clients backup list --json
router clients backup verify BACKUP_ID
router clients backup restore BACKUP_ID --dry-run
router clients backup restore BACKUP_ID
router clients backup restore BACKUP_ID --overwrite --yes
```

The default backup directory is `$XDG_CONFIG_HOME/link-assistant-router/client-backups`
on Unix (falling back to `~/.config`) and the equivalent Router directory under
`%APPDATA%` on Windows. `--destination` accepts an absolute path or `~/...`.
The command prints required and free bytes before copying. It uses a filesystem
clone when supported, and an ordinary copy otherwise. The backup, manifest and
checksums are stored under an owner-only directory. A crashed copy can leave
an `.incomplete-*` directory, which never appears in `list` or `restore`.
On Windows, Router restricts the directory ACL to the current account with
`icacls`; if Windows cannot apply that ACL, backup stops before copying data.
Ordinary copy errors remove the incomplete directory. `verify`
checks every file hash, size, type and mode, the exact inventory, and copies one
sample into an isolated temporary directory.

Backups include the selected home trees: sessions, project transcripts, prompt
history, checkpoints, memory and metadata stored there. The manifest lists any
unavailable stores and the command reports them. Socket files and directories
named `cache`, `Cache`, `CachedData` or `node_modules` are omitted. Gemini's
`.gemini/tmp` directory is retained because it contains resumable chats.
Open SQLite write-ahead sidecars cause backup to stop: close the client and
checkpoint its database before retrying. Active clients and concurrent Router
operations are blocked. Symlinks outside the profile are refused.

Credential files are excluded by default. `--include-credentials` includes
them in an **unencrypted local** backup; use it only on private storage. A
Router-managed server token and OS keychain secrets stay outside the profile
backup. Some settings or transcripts may contain secrets written by the client,
so treat every backup as private. To move one to another machine, encrypt it
before transport and verify it again after transfer. A same-volume clone does
not protect against disk failure.

Restore merges by default. Newer sessions and authentication already in the
destination remain in place. If a backed-up file differs at the same path,
restore writes a deterministic `.router-conflict-<digest>` copy; repeated merge
does not duplicate it. A root-file conflict is reported for manual review.
`--overwrite` requires `--yes`, prints an exact dry-run plan when requested,
and creates a separate verified recovery backup before replacing files. Restore
stages each profile beside its destination and rolls back a failed swap.

## Reset

```sh
router clients reset claude --profile router --dry-run
router clients reset claude --profile router
router clients reset --all --profile normal --json
router clients reset claude --full --dry-run
router clients reset claude --full --yes
```

The default reset removes only known user settings files and Router integration
settings. Sessions, projects, checkpoints, memory and authentication remain in
their active locations. `router with --reset-to-default-configuration claude`
uses this settings-only operation for its Router-owned Claude profile.

`--full` removes the selected local profile stores, including local sessions
and credentials, after a verified backup. It requires `--yes`; review the
paths and categories with `--dry-run` first. It never revokes remote tokens.
Both modes refuse malformed settings or an active client, and report inherited
environment variables that will still override fresh settings. Unset those
variables in the shell or service that launches the client. System and project
settings may also override user defaults and must be inspected separately.
The JSON plan has the same mode, scope, targets, categories and backup reference
for each client. A client without a persistent Router profile is reported as
unsupported for that scope.

## Binary maintenance

```sh
router clients update --all --dry-run --json
router clients update claude
router clients update gemini --latest
router clients reinstall claude --channel stable --dry-run
router clients reinstall claude --channel stable --yes
router clients install qwen --method npm --latest --dry-run
```

The plan identifies the binary, version, detected install method, channel,
vendor command or a precise unsupported reason. Existing installs never switch
package manager implicitly. npm updates require an explicit `--latest` or
`--channel`, because a version alone does not prove the original dist-tag.
Native Claude and Cursor updaters, OpenCode's updater, and documented npm or
Homebrew methods are used only when the method can be identified. Native Claude
reinstall accepts its `latest` or `stable` channel. Other methods, including
privileged package managers, report unsupported until a safe local command can
be proved. Reinstall requires `--yes` and a verified recovery backup of every
available local profile; install and update do not reset profiles. The binary
path and reported version are checked after the vendor command. A vendor
installer can still fail after changing its own files; the result reports
failure rather than claiming a rollback that the vendor does not offer.

## Profile locations and limitations

| Client | Normal stores | Router store | Override |
| --- | --- | --- | --- |
| Codex | `~/.codex` | none | `CODEX_HOME` |
| Claude | `~/.claude`, `~/.claude.json` | Router `clients/claude/home` | `CLAUDE_CONFIG_DIR` |
| Cursor Agent | `~/.cursor` | none | `CURSOR_CONFIG_DIR` |
| Gemini CLI | `~/.gemini` | Router `clients/gemini/home` | `GEMINI_CLI_HOME` is the parent of `.gemini` |
| Grok CLI | `~/.grok` | none | none known |
| OpenCode | config and data directories | none | `OPENCODE_CONFIG_DIR`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME` |
| Qwen Code | `~/.qwen` and separate runtime when set | none | `QWEN_HOME`, `QWEN_RUNTIME_DIR` |
| Agent | Router agent config and data directories | none | `XDG_CONFIG_HOME`, `XDG_DATA_HOME` |

On Unix, XDG config defaults to `~/.config` and XDG data to `~/.local/share`.
On Windows, Router uses `%APPDATA%` for config and `%LOCALAPPDATA%` for data.
Only known user-level stores are included; project-local files outside those
stores and OS keychain entries are not silently copied. Profiles with an
unknown root, unsupported file type or unreadable entry stop with an error.
Human-facing lifecycle text is English; unsupported locales explicitly fall
back to English. JSON keys and safety states are locale independent.

## Implementation choices and sources

The implementation uses [`reflink-copy`](https://docs.rs/reflink-copy/latest/reflink_copy/)
for clone-or-copy behavior and [`fs2`](https://docs.rs/fs2/latest/fs2/) for
space and lock checks. SQLite's [online backup API](https://www.sqlite.org/backup.html)
is the documented alternative for live databases; this command refuses live
write-ahead state instead. Client path and updater rules follow the
[Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference),
[Claude setup guide](https://code.claude.com/docs/en/setup),
[Gemini installation](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/installation.mdx)
and [configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md),
[Qwen settings](https://github.com/QwenLM/qwen-code/blob/main/docs/users/configuration/settings.md),
[Cursor installation](https://docs.cursor.com/en/cli/installation), and
[OpenCode CLI guide](https://dev.opencode.ai/docs/cli/).
Windows ACL handling follows Microsoft's
[`icacls` reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls).
