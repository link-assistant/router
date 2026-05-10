# Online Research

Only primary documentation was used for the implementation decision.

## Rust regex crate

Source: [docs.rs `regex` crate documentation](https://docs.rs/regex/latest/regex/)

Relevant facts:

- The crate documentation says the supported syntax is similar to other regex engines but lacks features
  that are not known how to implement efficiently, including look-around and backreferences.
- The same section states that searches have worst-case `O(m * n)` time complexity, where `m` is
  proportional to regex size and `n` is proportional to the searched string size.

Impact on this issue:

The failed script used positive look-ahead `(?=...)` in a Rust `Regex::new(...)` call. The CI failure is
therefore expected behavior from the `regex` crate, not a flaky CI runner or GitHub API issue.

## GitHub Releases API

Source: [GitHub REST API endpoints for releases](https://docs.github.com/en/rest/releases/releases#create-a-release)

Relevant facts:

- GitHub documents a `Create a release` endpoint.
- The endpoint requires `tag_name` and accepts `name` and `body` fields.
- Users with push access can create a release, and the endpoint can create a published release by default.

Impact on this issue:

`scripts/create-github-release.rs` builds a payload with `tag_name`, `name`, and `body`, then calls
`gh api repos/{owner}/{repo}/releases -X POST --input -`. The run failed before that API call could
complete because changelog extraction panicked while building the `body`.
