---
bump: minor
---

### Changed
- `router with` keeps the user's own client configuration by default, and `--isolated-config` asks for a directory of its own. `with` changes how the client reaches the model and nothing else, so discarding the user's theme, permissions, MCP servers, `settings.json` and `projects/` was a far larger side effect than choosing a connection route implies — an interactive user landed in first-run onboarding with `/resume` listing nothing (issue #277). Extending adds only the two connection variables to the environment of the process being launched; nothing the user owns is written or modified. Isolation remains right for CI and clean-room reproductions, which is the context where passing a flag is cheap. `--extend-global-config` still parses and now does nothing, so existing scripts keep working.
- A client whose routing depends on a file the router writes is isolated whatever was asked for. Gemini CLI sets both connection variables *and* needs a `settings.json` it resolves from `HOME`, so extending would have written that file where the client never looks and let the user's own settings decide the run (issue #227). Previously this combination was an error; as a default it would have made `with gemini` and `with opencode` fail outright, so it is now a fallback — the user asked to run a client, not to isolate one.

### Added
- `router auth import <provider> [<dir>]` adopts a login this machine already has, with `--all` for every login at once. Importing was reachable only as a differently-named flag on each provider's authorize command, so nothing in `auth --help` said it was possible: a user saw three "Authorize" entries and had to open each provider's help to discover the capability, then learn a separate flag name for each (issue #278). Authorizing and importing differ in prerequisites, side effects, and whether a human has to be present — which is what decides whether a headless deployment can be provisioned at all. `gemini` and `qwen` are importable through the same verb, and `gh` alongside them even though it is not a subscription. The per-provider flags keep working, and the report each import prints is unchanged.
- `--all` adopts what exists and reports what does not, rather than failing on the first provider this machine never logged in to: a workstation holding two of five logins is the ordinary case, not an error.

### Fixed
- An unqualified import reads the vendor's own home rather than the router's. `resolve_home` honours `CLAUDE_CODE_HOME` and friends, which in a deployment name the *destination*, so `auth import claude` with no directory resolved source and destination to the same path and refused itself as a self-import.
