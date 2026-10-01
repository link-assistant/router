## Problem

The Bun matrix leg in `release.yml` installs whatever Bun version is current at run time:

```yaml
# .github/workflows/release.yml:343 (f2cd4d8)
- name: Setup Bun
  uses: oven-sh/setup-bun@...
  with:
    bun-version: latest
```

The other runtimes are pinned to a major line (`node-version: '24.x'`, `deno-version: v2.x`), but Bun is not. A Bun release with a breaking change (Bun 1.x → 2.0, or a regression in `bun test`) would therefore turn every open pull request red overnight with no diff in the repository. The run also stops being reproducible, because re-running an old commit tests it against a different runtime.

Found while comparing pipelines for [link-assistant/router#648](https://github.com/link-assistant/router/issues/648), which pins all of its tools and runner labels.

## Reproduction

```bash
git clone https://github.com/link-foundation/js-ai-driven-development-pipeline-template.git
cd js-ai-driven-development-pipeline-template
grep -n 'bun-version' .github/workflows/*.yml
# .github/workflows/release.yml:343:          bun-version: latest
```

## Workaround

Set `bun-version: '1.x'` (or an exact `1.3.x`) by hand.

## Suggested fix

Use the same policy as the other runtimes: either `bun-version: '1.x'`, or put the version in `package.json` (`"packageManager"`/`engines.bun`) and use `bun-version-file: package.json` so Dependabot can bump it. Then add an assertion to the workflow tests that rejects `bun-version: latest`.
