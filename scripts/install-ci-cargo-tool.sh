#!/usr/bin/env bash
# Install a published command with the dependency lock verified in Router CI.
set -euo pipefail

tool=${1:-}
if [[ -z "$tool" ]]; then
  printf 'Usage: %s <package> [cargo install options]\n' "$0" >&2
  exit 2
fi
shift

scripts_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
tool_dir="$scripts_dir/ci/cargo-tools"
version=
while IFS=$'\t' read -r package release checksum; do
  if [[ "$package" == "$tool" ]]; then
    version=$release
    break
  fi
done < "$tool_dir/releases.tsv"
if [[ -z "$version" ]]; then
  printf 'No verified Cargo tool release for %s\n' "$tool" >&2
  exit 2
fi

archive_name="$tool-$version"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
archive="$work/$archive_name.crate"
curl --fail --silent --show-error --location --retry 3 --proto '=https' \
  "https://static.crates.io/crates/$tool/$archive_name.crate" --output "$archive"
if command -v sha256sum >/dev/null; then
  actual=$(sha256sum < "$archive")
else
  actual=$(shasum -a 256 < "$archive")
fi
if [[ "${actual%% *}" != "$checksum" ]]; then
  printf 'Crate archive checksum mismatch for %s %s\n' "$tool" "$version" >&2
  exit 1
fi

tar -xzf "$archive" -C "$work"
cp -- "$tool_dir/$tool/Cargo.lock" "$work/$archive_name/Cargo.lock"
# The restored binary can have the same tool version but a different lock.
cargo install --path "$work/$archive_name" --locked --force "$@"
