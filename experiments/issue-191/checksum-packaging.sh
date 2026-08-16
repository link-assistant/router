#!/usr/bin/env bash
# Reproduces issue #191's checksum defect and proves the packaging fix.
#
# Old packaging ran `sha256sum dist/*.tar.gz` from the repository root, so the
# published .sha256 recorded `dist/...` paths. `gh release download` writes the
# assets flat, so the documented `sha256sum -c <file>.sha256` failed with
# "No such file or directory" even though the digests were correct.
#
# Usage: bash experiments/issue-191/checksum-packaging.sh
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
workspace="$(mktemp -d)"
trap 'rm -rf "$workspace"' EXIT
cd "$workspace"

version=0.77.0
platform=linux-arm64
prefix="link-assistant-router-${version}-${platform}"
tag_commit=c36818b5386486ab74b88740f683076e4015c750

mkdir -p dist
echo "router binary" > "dist/${prefix}.tar.gz"
echo '{"bomFormat":"CycloneDX"}' > "dist/${prefix}.cdx.json"

echo "== old packaging =="
sha256sum dist/*.tar.gz dist/*.cdx.json > "dist/${prefix}.sha256"
cat "dist/${prefix}.sha256"

# What a consumer gets from `gh release download`: a flat directory.
mkdir -p downloaded-old
cp "dist/${prefix}".* downloaded-old/
old_verification="$(cd downloaded-old && sha256sum -c "${prefix}.sha256" 2>&1 || true)"
echo "$old_verification"
if grep -q "No such file" <<<"$old_verification"; then
  echo "reproduced: the published checksum file cannot be verified where it lands"
else
  echo "FAILED to reproduce the consumer-side checksum failure" >&2
  exit 1
fi
rust-script "${repository_root}/scripts/check-release-provenance.rs" \
  --release-version "$version" --expected-commit "$tag_commit" --skip-attestations --asset-dir downloaded-old && {
  echo "FAILED: the guard accepted dist/-prefixed checksums" >&2
  exit 1
} || echo "guard rejected the prefixed checksum file as expected"

echo "== new packaging =="
(
  cd dist
  sha256sum ./*.tar.gz ./*.cdx.json | sed 's| \./| |'
) > "dist/${prefix}.sha256"
# The workflow uses a plain glob inside dist/; ./-prefixes are stripped here only
# because this script reuses one directory for both variants.
cat "dist/${prefix}.sha256"

mkdir -p downloaded-new
cp "dist/${prefix}".* downloaded-new/
(cd downloaded-new && sha256sum -c "${prefix}.sha256")
rust-script "${repository_root}/scripts/check-release-provenance.rs" \
  --release-version "$version" --expected-commit "$tag_commit" --skip-attestations --asset-dir downloaded-new
echo "fixed: flat checksum names verify in the download directory"
