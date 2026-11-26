#!/usr/bin/env bash
# Bootstrap the first npm publication of @link-assistant/router (issue #805).
#
# npm Trusted Publishing can only be configured for a package that already
# exists, so the very first publication needs an npm owner's credential. This
# script publishes the exact, already attested GitHub release asset; it never
# rebuilds the package. Without --publish it only verifies and runs
# `npm publish --dry-run`.
#
# Usage: scripts/bootstrap-npm-package.sh VERSION [--publish]
#
# Requirements: gh (authenticated), node/npm >= 11.5.1, python3, and for
# --publish an `npm login` session of an @link-assistant owner (npm asks for
# the MFA one-time password during publication).
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 || ( $# -eq 2 && "$2" != "--publish" ) ]]; then
  echo "usage: $0 VERSION [--publish]" >&2
  exit 2
fi
version="$1"
mode="${2:-}"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: VERSION must be MAJOR.MINOR.PATCH without a leading v" >&2
  exit 2
fi

repository="${ROUTER_REPOSITORY:-link-assistant/router}"
helper="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/registry-distributions.py"
asset="link-assistant-router-${version}.tgz"
workdir="$(mktemp -d "${TMPDIR:-/tmp}/router-npm-bootstrap.XXXXXX")"
trap 'rm -rf "$workdir"' EXIT

commit="$(gh api "repos/${repository}/commits/v${version}" --jq .sha)"
echo "Release v${version} is tagged at ${commit}"

gh release download "v${version}" --repo "$repository" --pattern "$asset" --dir "$workdir"
gh attestation verify "$workdir/$asset" --repo "$repository" \
  --source-ref "refs/tags/v${version}" --source-digest "$commit"

tar -xzOf "$workdir/$asset" package/package.json | EXPECTED="$version" node -e '
  let text = "";
  process.stdin.on("data", (chunk) => { text += chunk; });
  process.stdin.on("end", () => {
    const manifest = JSON.parse(text);
    if (manifest.name !== "@link-assistant/router" || manifest.version !== process.env.EXPECTED) {
      throw new Error(`unexpected package identity ${manifest.name}@${manifest.version}`);
    }
  });'

present="$(python3 "$helper" npm --version "$version" --assets "$workdir" --probe)"
if [[ "$present" == "present=true" ]]; then
  echo "@link-assistant/router@${version} is already published with identical bytes; nothing to bootstrap."
  exit 0
fi

if [[ "$mode" != "--publish" ]]; then
  npm publish "$workdir/$asset" --access public --dry-run
  echo "Verified ${asset}. Rerun with --publish after npm login to publish it."
  exit 0
fi

echo "Publishing as npm user: $(npm whoami)"
# --provenance needs a CI OIDC identity; the GitHub attestation verified above
# remains the provenance of this bootstrap asset.
npm publish "$workdir/$asset" --access public
python3 "$helper" npm --version "$version" --assets "$workdir"

cat <<EOF
Bootstrap complete. Next steps (docs/ci-cd/registry-publishers.md):
  1. npm package settings -> Trusted Publisher -> GitHub Actions:
     organization link-assistant, repository router, workflow release.yml,
     no environment.
  2. Retry the remaining registry jobs of the existing release:
     gh workflow run release.yml --repo ${repository} --ref main \\
       -f release_mode=retry-registries -f release_version=${version} \\
       -f source_run=<tagged release run id> -f bump_type=patch
  3. Verify the next release publishes through OIDC, then revoke any NPM_TOKEN.
EOF
