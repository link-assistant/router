### Fixed
- The published runtime image can now run the documented `setup-token` login. `POST /api/login` with `LOGIN_CLI_ARGS=setup-token` returned HTTP 502 (`Unable to spawn claude … No viable candidates found in PATH`) because the narrow mode still drove the absent vendor CLI. Both login modes now run as in-process OAuth, so one published image serves the full Claude Code scope set and the narrow `user:inference` alternative without a rebuild or a vendor binary.

### Added
- `POST /api/login` accepts a `mode` field (`full` or `setup-token`) and `auth claude` accepts a matching `--mode`, so the scope set is selectable per request rather than only per deployment. `LOGIN_CLI_ARGS=setup-token` continues to select the narrow mode as a deployment default.
- `doctor` reports whether each login mode is available and which scopes it would request, before a login is started. `LOGIN_CLI_COMMAND` remains the only configuration that spawns a process, and is the only one that can be reported unavailable.
