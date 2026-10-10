# Contributing to rust-ai-driven-development-pipeline-template

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Development Setup

Clone `https://github.com/link-assistant/router.git`, then install Node 20 or newer and Bun for the JavaScript development gate. Install package dependencies with:

```bash
npm ci --prefix packages/javascript
```

Rust, rustfmt, Clippy and rust-script remain tools for the Rust implementation and its CI checks. Install them when working on that surface, rather than compiling the project as the first setup step. Optional pre-commit hooks use `pip install pre-commit` and `pre-commit install`; their required checks must follow the JavaScript-first gate and avoid full local Cargo builds.

## Development Workflow

Create a feature branch or isolated worktree, implement behavior in JavaScript, add targeted behavioral tests and update documentation. Read [the JavaScript-first workflow](docs/development/javascript-first.md) for the parity boundary and generation limitations. Router's JavaScript operations package and a valid parity inventory do not by themselves establish complete Rust runtime parity.

Run the complete local gate:

```bash
node scripts/check-js-first-local.mjs --stamp /tmp/router-js-first-gate.json
```

It runs the actual JavaScript lint, native Node and Bun tests, type checks, strict parity, forward translation and reverse regeneration checks. A missing or partial parity entry keeps the gate red. Fix all reported failures together. Individual diagnostics such as `npm test --prefix packages/javascript`, `npm run typecheck --prefix packages/javascript`, `node scripts/check-router-parity.mjs` and `node --test scripts/test/*.test.mjs` help locate failures but do not replace the complete gate.

Use CI for broader Rust verification after the JavaScript gate. Do not run full local Cargo builds, test suites or Clippy. Only an explicitly necessary targeted exception can use the bounded shared build wrapper after a green stamp for the current SHA and file contents:

```bash
# Preview only: this does not invoke Cargo.
bash scripts/bounded-rust-build.sh -- check --lib
# Explicit exception after the complete gate is green.
bash scripts/bounded-rust-build.sh --execute --gate-stamp /tmp/router-js-first-gate.json -- check --lib
```

The Rust suite continues to define tiers 1-3, which require no credential. The live credentialed tier (tier 4) is a no-op without a subscription and says so rather than passing quietly — see [docs/testing-tiers.md](docs/testing-tiers.md) for what each tier proves. CI runs the relevant Rust checks; the tier documentation also describes targeted diagnostic commands, which must obey the bounded local exception policy.

Changes to stream or request translators, token and credential code, the proxy, storage or keychain lookup also trigger slower path-filtered workflows: benchmarks against the pull request's base (`benches/`), a one-minute soak (`tests/soak_test.rs`), mutation testing of touched lines (`.cargo/mutants.toml`), the macOS Keychain suite and the upgrade matrix over the last three releases. Translator changes can require updated recorded cassettes in `tests/fixtures/vendor/`; the recording tool is `rust-script scripts/record-vendor-fixtures.rs`. Preserve these checks and require the JavaScript gate before Rust compilation.

For user-facing changes, add a changelog fragment in `changelog.d/` named `YYYYMMDD_HHMMSS_description.md`:

```bash
touch changelog.d/$(date +%Y%m%d_%H%M%S)_my_change.md
```

Use the existing categories, for example:

```markdown
### Added
- Description of new feature

### Fixed
- Description of bug fix
```

Fragments prevent merge conflicts in CHANGELOG.md when multiple PRs are open. Commit focused changes with descriptive messages. In a coordinated agent task, workers draft commits in their own worktrees and one designated push gate owner integrates and publishes the combined change. The owner reviews the full diff, runs the complete gate, pushes one tested head and waits for all CI jobs to complete. Never cancel the current CI run or push speculative fixes; collect the full failure set and repair it in one coordinated batch before the next push.

## Code Style Guidelines

This project uses:

- Native JavaScript tests and TypeScript checks for fast development feedback
- Deterministic translation and regeneration checks for covered generated code
- **rustfmt** for Rust formatting, and CI **Clippy** with pedantic and nursery lints
- The existing Rust test tiers in CI after the complete JavaScript gate

### Code Standards

- Follow JavaScript idioms for development sources and Rust idioms for native or translated Rust
- Use documentation comments (`///`) for all public APIs
- Write tests for all new functionality
- Keep functions focused and reasonably sized
- Keep files under 1000 lines
- Use meaningful variable and function names

### Terminology: it is a links network, never a graph

The structure this project stores its tokens in is a **links network**: links
whose sources and targets are themselves links. The word *graph* is not used
for it, and CI rejects it.

The distinction is load-bearing rather than stylistic. In a graph you have
vertices joined by edges, and the edge is a relationship *between* two things
that are not themselves edges. In a links network there is no separate kind of
thing to be a vertex: every link is addressable, and a link can be the source
or target of another link. A "point" is just a link whose source and target are
itself. Calling it a graph invites reasoning that quietly does not hold — that
edges are anonymous, that they cannot be referenced, that vertices are a
distinct population to be counted separately.

- **Write:** "links network", or plain **"network"** where the context already
  makes it clear ("the network is parsed once per process").
- **Do not write:** "graph", "the doublets graph", "semantic graph",
  `parse_graph()`, `let graph = ...`.

This applies to **identifiers as well as prose** — variable, function, type and
test names — and to documentation in **every human language**, not only
English.

Other people's names for their own things are fine, and the check allows them:
GraphQL, Git's *object graph*, a build system's *dependency graph*, and
ordinary words that merely contain the letters (paragraph, lexicographic,
geographic). If you hit a genuine case the check does not know about, add it to
`ALLOWED_PHRASES` in `scripts/check-terminology.rs` **with a reason** — the
list is deliberately narrow.

This file, `CHANGELOG.md` and `changelog.d/` may name the word freely, because
their job is to state the rule and to record that the wording changed. They are
the only places that may. Everywhere else — source, `README.md`, the rest of
`docs/`, workflows — is checked, so do not reach for the changelog as a way to
say it elsewhere.

Run it locally the way CI does:

```bash
rust-script scripts/check-terminology.rs
```

`dev/log/` and captured third-party text under `docs/case-studies/*/raw/` are
excluded as records rather than as wording to fix — editing them would falsify
what was written at the time — and `ui/dist/` is a built bundle.

### Documentation Format

Use Rust documentation comments:

```rust
/// Brief description of the function.
///
/// Longer description if needed.
///
/// # Arguments
///
/// * `arg1` - Description of arg1
/// * `arg2` - Description of arg2
///
/// # Returns
///
/// Description of return value
///
/// # Errors
///
/// Description of when errors are returned
///
/// # Examples
///
/// ```
/// use my_package::example_function;
/// let result = example_function(1, 2);
/// assert_eq!(result, 3);
/// ```
pub fn example_function(arg1: i32, arg2: i32) -> i32 {
    arg1 + arg2
}
```

## Testing Guidelines

- Write tests for all new features
- Maintain or improve test coverage
- Use descriptive test names
- Organize tests in modules when appropriate
- Use `#[cfg(test)]` for test-only code

Example test structure:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    mod my_feature_tests {
        use super::*;

        #[test]
        fn test_basic_functionality() {
            assert_eq!(my_function(), expected_result);
        }

        #[test]
        fn test_edge_case() {
            assert_eq!(my_function(edge_case_input), expected_result);
        }
    }
}
```

## Pull Request Process

1. Run the complete JavaScript gate and review parity and generated diffs
2. Update documentation if needed
3. Add a changelog fragment (see step 5 in Development Workflow)
4. Ensure the PR description clearly describes the changes
5. Link any related issues in the PR description
6. Leave the current CI run intact and wait for every required check to finish
7. Address any review feedback

## Changelog Management

This project uses a fragment-based changelog system similar to [Scriv](https://scriv.readthedocs.io/) (Python) and [Changesets](https://github.com/changesets/changesets) (JavaScript).

### Creating a Fragment

```bash
# Create a new fragment with timestamp
touch changelog.d/$(date +%Y%m%d_%H%M%S)_description.md
```

### Fragment Categories

Use these categories in your fragments:

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed in future
- **Removed**: Features that were removed
- **Fixed**: Bug fixes
- **Security**: Security-related changes

### During Release

Fragments are automatically collected into CHANGELOG.md during the release process. The release workflow:

1. Collects all fragments
2. Updates CHANGELOG.md with the new version entry
3. Removes processed fragment files
4. Bumps the version in Cargo.toml
5. Creates a git tag and GitHub release

## Project Structure

```
.
├── .github/workflows/    # GitHub Actions CI/CD
├── changelog.d/          # Changelog fragments
│   ├── README.md         # Fragment instructions
│   └── *.md              # Individual changelog fragments
├── examples/             # Usage examples
├── scripts/              # JavaScript gate/generation tools and existing Rust/Python helpers
├── src/
│   ├── lib.rs            # Library entry point
│   └── main.rs           # Binary entry point
├── tests/                # Rust integration tests; JS tests live under packages/ and scripts/
├── .gitignore            # Git ignore patterns
├── .pre-commit-config.yaml  # Pre-commit hooks
├── Cargo.toml            # Project configuration
├── CHANGELOG.md          # Project changelog
├── AGENTS.md             # JavaScript-first and coordination instructions
├── CONTRIBUTING.md       # This file
├── LICENSE               # Unlicense (public domain)
└── README.md             # Project README
```

## Release Process

This project uses semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Releases are managed through GitHub releases. To trigger a release:

1. Manually trigger the release workflow with a version bump type
2. Or: Update the version in Cargo.toml and push to main

## Getting Help

- Open an issue for bugs or feature requests
- Use discussions for questions and general help
- Check existing issues and PRs before creating new ones

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

Thank you for contributing!
