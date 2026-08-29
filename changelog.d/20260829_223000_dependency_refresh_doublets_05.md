---
bump: minor
---

### Changed
- Upgraded `doublets` from 0.4 to 0.5, whose fixed unit-store update makes `Doublets::delete_all` usable again on a store holding real links.
- The token store's file mapping now comes from `link-cli` 0.2.10 (`link_cli::storage::PersistentFileMapped`) instead of an adapter maintained in this repository.
- File locking now uses the standard library's `File::lock`, `lock_shared`, `try_lock` and `unlock`, stabilised in Rust 1.89, in place of the unmaintained `fs2` crate.
- Raised the minimum supported Rust version to 1.89; the release-workflow test derives the toolchain floor it enforces from `rust-version` in `Cargo.toml` rather than hardcoding it.
- Refreshed `Cargo.lock` to the latest compatible versions of every transitive dependency.

### Removed
- Removed `src/storage/file_mapped.rs`, the crate's only `unsafe` code, along with its scoped `unsafe_code` exception.
- Removed the `fs2` and `platform-mem` direct dependencies.
