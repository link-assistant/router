## Problem

GitHub announced that `ubuntu-latest` moves from Ubuntu 24.04 to **Ubuntu 26.04 between 2026-10-19 and 2026-11-19** ([actions/runner-images#14748](https://github.com/actions/runner-images/issues/14748)). Every job on the alias already prints:

> The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026.

The template uses the alias 26 times at 03f3c84. Generated repositories inherit the warning and an unreviewed change of OS, system Python and preinstalled tools. The JS template already fixed this in [js#193](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/193). Found while auditing link-assistant/router CI ([router#648](https://github.com/link-assistant/router/issues/648)), where the notice appeared 26 times per run.

## Reproduction

```bash
git clone https://github.com/link-foundation/python-ai-driven-development-pipeline-template.git
cd python-ai-driven-development-pipeline-template
grep -c ubuntu-latest .github/workflows/*.yml | grep -v ':0'
# docs.yml:3  links.yml:2  release.yml:14  security.yml:4  workflows.yml:3
```

## Workaround

Replace `ubuntu-latest` with `ubuntu-24.04` in `runs-on:` and matrix values.

## Suggested fix

Pin the labels as in js#193, and add a test that rejects `-latest` runner aliases in `.github/workflows/*.yml`:

```python
for path in Path(".github/workflows").glob("*.yml"):
    for line in path.read_text().splitlines():
        if not line.lstrip().startswith("#"):
            assert "ubuntu-latest" not in line, f"{path}: pin the runner OS: {line}"
```

Move to `ubuntu-26.04` as a deliberate, reviewed change.
