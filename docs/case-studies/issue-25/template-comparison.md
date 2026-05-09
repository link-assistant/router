# Template Comparison

## Data Collected

| Repository | Data |
|---|---|
| `link-assistant/router` | `raw/router-tree.json`, current `.github/workflows/release.yml`, `Dockerfile` |
| `link-foundation/js-ai-driven-development-pipeline-template` | `raw/js-template-tree.json`, `raw/js-template-release.yml` |
| `link-foundation/rust-ai-driven-development-pipeline-template` | `raw/rust-template-tree.json`, `raw/rust-template-release.yml` |
| `link-foundation/python-ai-driven-development-pipeline-template` | `raw/python-template-tree.json`, `raw/python-template-release.yml` |
| `link-foundation/csharp-ai-driven-development-pipeline-template` | `raw/csharp-template-tree.json`, `raw/csharp-template-release.yml` |

The normalized workflow/script/package file listing is saved in `raw/template-ci-file-trees.txt`.

## Findings

| Area | Router before fix | Template comparison | Router after fix |
|---|---|---|---|
| Rust CI toolchain | `dtolnay/rust-toolchain@stable` | Rust template also uses `dtolnay/rust-toolchain@stable`. | Unchanged |
| Docker builder toolchain | `rust:1.82-slim` | Templates do not include Dockerfiles or Docker release publishing. | `rust:1-slim-bookworm` |
| Runtime base | `debian:bookworm-slim` | No matching template Docker runtime. | Unchanged |
| Release Docker publishing | GHCR and Docker Hub via official Docker actions | JS/Python/C#/Rust templates focus on language package releases, not router-style container publishing. | Unchanged |
| Regression coverage | No Dockerfile toolchain guard | No directly reusable template guard. | Added Rust test for supported Docker builder image |

## Template Issue Decision

No upstream template issues were opened for issue #25 because the exact failure requires all of these conditions:

1. A Dockerfile that builds Rust dependencies inside a container.
2. A pinned Rust/Cargo builder older than 1.85.
3. A dependency graph containing Rust 2024 edition metadata.
4. A release workflow that builds and pushes the Docker image after package publication.

The referenced templates do not contain Dockerfiles or Docker image publishing steps, so the same pinned-Docker-toolchain bug was not present there.

## Reused Practices

The Rust template validates the router's existing CI practice of using `dtolnay/rust-toolchain@stable` for lint, test, build, and release jobs. The Docker fix aligns the container build with that same stable-toolchain intent while keeping the builder on Debian bookworm to match the runtime image family.
