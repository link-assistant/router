# Dependency scope and retained versions

The starting manifest scan used the tracked Git tree. In addition to the issue listing, it found the npm projects under `js`, `ts`, `ui`, and `scripts/ci`, the PyPI package under `packages/python`, the `rust/fuzz` Cargo workspace, standalone Rust experiments, and the Nix flake. Go, Java and PHP client material uses generated fixtures and downstream tooling. The scan found no consumer-owned `go.mod`, Maven or Gradle build, or `composer.json`. Terraform and Helm manifests were also absent.

The captured Proxypal input for issue #37 and the captured test-sharder incident for issue #759 are provenance records. Updating their copied dependencies would change the historical inputs. The active sharder is under `experiments/issue-725/test-sharder`. The standalone `experiments/issue-372` pins earlier versions to reproduce the behavior being investigated. The npm and Cargo inventories include the captures they scanned so their historical pins can be traced to paths.

The npm registry `latest` tag for `@iarna/toml` is 2.2.5. Both Router implementations intentionally use the publisher's newer 3.0.0 TOML 1.0 release, distributed under the `toml-1.0.0-rc.1` tag. Retaining 3.0.0 preserves the parser semantics used by the current sources. [Publisher dist-tags](https://registry.npmjs.org/-/package/@iarna%2ftoml/dist-tags).
