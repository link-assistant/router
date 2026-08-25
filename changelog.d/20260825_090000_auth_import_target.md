---
bump: patch
---

### Fixed
- `auth import` no longer answers about the local credential home when another router is the target. `--server` parsed and was then discarded, so all three spellings — `--server URL`, a persisted selection, and `--local` — produced one behaviour, which made the flags actively misleading rather than merely inert (issue #291). The failure was a wrong-target action wearing a plausible answer: `error: claude is already read from /Users/me/.claude` reads as a coherent reply to a question about the selected server, and nothing in it revealed that the server was never consulted.
- Import installs into the credential home of the machine running it, and no router accepts a credential document over HTTP — `/api/login` begins an interactive OAuth flow and `submit_code` takes a short-lived code, neither of which adopts a credential that already exists. So there is no remote import to perform, and it now refuses, naming the selected router *and the directory that router reads its credential from*, which it asks the deployment for. `--local` remains the way to ask for this machine. This is issue #283's remedy applied to the one command that still had the defect.
- `auth import --help` and the README no longer describe importing as provisioning a deployment from a workstation, which is the case that refuses. Authorizing a remote deployment from here is what `auth claude` and `auth codex` already do.
