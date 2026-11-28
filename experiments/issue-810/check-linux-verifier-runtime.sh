#!/usr/bin/env bash
# Exercise the Linux verifier's two npm bootstrap paths without Docker or Rust.
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/bin" "$work/repo/scripts"
cp "$root/scripts/verify-contracts-in-linux.sh" "$work/repo/scripts/"

cat > "$work/bin/probe" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
case "${0##*/}" in
  docker)
    if [[ "$1" == info ]]; then exit 0; fi
    while [[ "$1" != bash ]]; do shift; done
    export ROUTER_VERIFY_HOST_UID=1000 ROUTER_REAL_CLIENT_CLAUDE_VERSION=2.1.332
    export ROUTER_REAL_CLIENT_CODEX_VERSION=0.172.0 ROUTER_REAL_CLIENT_OPENCODE_VERSION=1.19.6
    exec "$@"
    ;;
  dpkg) printf '%s\n' "$ROUTER_VERIFIER_ARCH" ;;
  sha256sum) cat >> "$ROUTER_VERIFIER_LOG" ;;
  stat) printf '1000\n' ;;
  *) printf '%s %s\n' "${0##*/}" "$*" >> "$ROUTER_VERIFIER_LOG" ;;
esac
BASH
chmod +x "$work/bin/probe"
for bin in docker dpkg apt-get curl sha256sum tar rm npm useradd chown stat runuser; do
  ln -s probe "$work/bin/$bin"
done

for arch in amd64 riscv64; do
  log="$work/$arch.log"
  env -i "PATH=$work/bin:/usr/bin:/bin" "ROUTER_VERIFIER_ARCH=$arch" "ROUTER_VERIFIER_LOG=$log" \
    bash "$work/repo/scripts/verify-contracts-in-linux.sh" --client-versions ci > "$work/output" 2>&1
  grep -qF -- 'npm install --global --silent --allow-scripts=@anthropic-ai/claude-code,opencode-ai' "$log"
  grep -qF -- 'bash /source/scripts/install-ci-cargo-tool.sh rust-script --quiet' "$log"
done

grep -qF 'https://nodejs.org/dist/v26.13.1/node-v26.13.1-linux-x64.tar.xz' "$work/amd64.log"
grep -qF '5c063e46bab0fbc1c17cc445d7ff129cbdcd0471be6ed83b6ab864f8143bc864' "$work/amd64.log"
grep -qFx 'npm install --global --ignore-scripts npm@12.2.3' "$work/amd64.log"
grep -qFx 'apt-get install -y --no-install-recommends nodejs npm' "$work/riscv64.log"
grep -qFx 'npm install --global --ignore-scripts npm@11.21.3' "$work/riscv64.log"
if grep -q '^curl ' "$work/riscv64.log"; then
  echo 'The verifier requested a Node 26 archive on riscv64' >&2
  exit 1
fi
