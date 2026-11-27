#!/usr/bin/env bash
# Check the download, checksum and lock handoff without running Cargo.
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/bin" "$work/source/demo-1.0.0" "$work/scripts/ci/cargo-tools/demo"
cp "$root/scripts/install-ci-cargo-tool.sh" "$work/scripts/"
printf 'original lock\n' > "$work/source/demo-1.0.0/Cargo.lock"
printf 'reviewed lock\n' > "$work/scripts/ci/cargo-tools/demo/Cargo.lock"
export ROUTER_TOOL_TEST_ARCHIVE="$work/demo-1.0.0.crate"
tar -czf "$ROUTER_TOOL_TEST_ARCHIVE" -C "$work/source" demo-1.0.0
if command -v sha256sum >/dev/null; then
  checksum=$(sha256sum < "$ROUTER_TOOL_TEST_ARCHIVE")
else
  checksum=$(shasum -a 256 < "$ROUTER_TOOL_TEST_ARCHIVE")
fi
manifest="$work/scripts/ci/cargo-tools/releases.tsv"
printf 'demo\t1.0.0\t%s\n' "${checksum%% *}" > "$manifest"

cat > "$work/bin/curl" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
[[ "${*: -3:1}" == https://static.crates.io/crates/demo/demo-1.0.0.crate ]]
[[ "${*: -2:1}" == --output ]]
cp "$ROUTER_TOOL_TEST_ARCHIVE" "${*: -1}"
BASH
cat > "$work/bin/cargo" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
[[ "$#" == 6 && "$1" == install && "$2" == --path && "$4" == --locked && "$5" == --force && "$6" == --quiet ]]
[[ "$(cat "$3/Cargo.lock")" == 'reviewed lock' ]]
printf 'installed from reviewed lock\n' > "$ROUTER_TOOL_TEST_CALLED"
BASH
chmod +x "$work/bin/curl" "$work/bin/cargo"
export PATH="$work/bin:$PATH" ROUTER_TOOL_TEST_CALLED="$work/installed"

printf 'cached binary from earlier lock\n' > "$ROUTER_TOOL_TEST_CALLED"
bash "$work/scripts/install-ci-cargo-tool.sh" demo --quiet
grep -Fx 'installed from reviewed lock' "$ROUTER_TOOL_TEST_CALLED"
rm "$ROUTER_TOOL_TEST_CALLED"
printf 'demo\t1.0.0\t%s\n' "$(printf '%064d' 0)" > "$manifest"
if bash "$work/scripts/install-ci-cargo-tool.sh" demo --quiet 2> "$work/error"; then
  echo 'The installer accepted an incorrect archive checksum' >&2
  exit 1
fi
grep -Fx 'Crate archive checksum mismatch for demo 1.0.0' "$work/error"
[[ ! -e "$ROUTER_TOOL_TEST_CALLED" ]]
