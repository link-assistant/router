# CI Cargo tool dependencies

`releases.tsv` records the crates.io package name, release version and archive SHA-256. `scripts/install-ci-cargo-tool.sh` verifies the published source before installing it with the matching committed lock.

When updating these tools, use the target version's crates.io archive and the checksum from the registry index. In hosted CI after the same-SHA JavaScript gate, verify the archive checksum, extract it and run `cargo update --manifest-path <archive-directory>/Cargo.toml`. Scan the resulting lock for advisories and verify the tool install in its existing consumer jobs. Commit the generated lock with the corresponding release entry and keep the hosted run and artifact digests with the update evidence. The release archives supply their own manifests and are fetched when used.

[Original lock refresh and advisory results](../../../dev/log/issues/810/pulls/811/ci.md#cargo-tool-advisories).
