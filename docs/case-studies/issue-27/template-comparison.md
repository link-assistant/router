# Template Comparison

## Data Collected

| Repository | Archived Data |
|---|---|
| `link-assistant/router` | `raw/router-tree.json`, `raw/router-file-tree.txt`, current `.github/workflows/release.yml`, `Dockerfile` |
| `link-foundation/js-ai-driven-development-pipeline-template` | `raw/js-template-tree.json`, `raw/js-template-file-tree.txt`, `raw/js-template-release.yml` |
| `link-foundation/rust-ai-driven-development-pipeline-template` | `raw/rust-template-tree.json`, `raw/rust-template-file-tree.txt`, `raw/rust-template-release.yml` |
| `link-foundation/python-ai-driven-development-pipeline-template` | `raw/python-template-tree.json`, `raw/python-template-file-tree.txt`, `raw/python-template-release.yml` |
| `link-foundation/csharp-ai-driven-development-pipeline-template` | `raw/csharp-template-tree.json`, `raw/csharp-template-file-tree.txt`, `raw/csharp-template-release.yml` |

The normalized CI/CD-related file listing is saved in `raw/template-ci-file-trees.txt`.

## Findings

| Area | Router Before Fix | Template Comparison | Router After Fix |
|---|---|---|---|
| Rust host CI toolchain | `dtolnay/rust-toolchain@stable` for lint, tests, package build, and release. | Rust template also uses stable Rust setup for its Rust release workflow. | Unchanged. |
| Docker builder stage | `rust:1-slim-bookworm` without OpenSSL build packages. | Templates do not include a Dockerfile or Docker image build/publish path. | Builder installs `pkg-config` and `libssl-dev` before dependency compilation. |
| Docker publish workflow | Auto and manual release jobs publish to GHCR and Docker Hub after crates.io publication. | Templates focus on language package publishing; no matching Docker publish section. | Unchanged. |
| Apt best practices | Runtime stage used one apt layer with cleanup; builder stage had no apt package setup. | No directly reusable Dockerfile from templates. | Builder follows the same single-layer apt install and cleanup pattern. |
| Regression coverage | Existing Dockerfile test only guarded the Rust toolchain tag. | No directly reusable test. | Added a Dockerfile test that guards native TLS build dependencies before the cached dependency build. |

## Upstream Template Issue Decision

No upstream template issues were opened. The failure requires this combination:

1. A Rust Dockerfile builder stage.
2. A dependency graph that compiles `openssl-sys`.
3. A slim Debian builder image without `pkg-config` and OpenSSL development headers.
4. A release workflow that builds and pushes Docker images.

The named templates do not include that Dockerfile and Docker image publishing path, so the same bug is not present there.

## Reused Practices

- Kept stable Rust host CI behavior aligned with the Rust template.
- Kept the existing Docker publish sequence after crates.io publication.
- Applied Docker's recommended apt pattern to the builder stage: combine package index refresh and install in one layer, use `--no-install-recommends`, and clean apt metadata.
