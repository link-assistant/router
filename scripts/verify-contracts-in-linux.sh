#!/usr/bin/env bash
# Prove the vendor areas of scripts/verify-contracts.rs from macOS (issue #654).
#
# Native macOS vendor probes are refused: a temporary HOME does not isolate the
# login Keychain, so launching Claude Code or Codex could read or prompt for the
# developer's own credentials. This script establishes the boundary a different
# way. It runs the verifier inside a disposable Linux container that has no
# Keychain, no access to the developer's home directory, and only the
# environment variables named below. The container is removed when it exits.
#
# Usage:
#   scripts/verify-contracts-in-linux.sh                      # real-clients and zai-only-entitlements
#   scripts/verify-contracts-in-linux.sh --area real-clients  # any verify-contracts.rs arguments
#
# Requirements: Docker Desktop (or any `docker`-compatible runtime) on the host.
# Nothing else is installed on the host; the vendor CLIs are installed into the
# container from npm at the pinned versions CI uses.
#
# Forwarded only when set on the host (values are never printed):
#   ROUTER_LIVE_ZAI_API_KEY, ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST,
#   ROUTER_HOST_CLI_TESTS, ROUTER_HOST_CLI_URL, ROUTER_HOST_CLI_TOKEN
#
# Results: target/verification-linux/result.json and one log per area.

set -euo pipefail

repository="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="${repository}/target/verification-linux"
image="${ROUTER_VERIFY_LINUX_IMAGE:-rust:1.98.1-slim-trixie}"
claude="${ROUTER_REAL_CLIENT_CLAUDE_VERSION:-2.1.265}"
codex="${ROUTER_REAL_CLIENT_CODEX_VERSION:-0.154.0}"
opencode="${ROUTER_REAL_CLIENT_OPENCODE_VERSION:-1.18.29}"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    echo "error: a running Docker runtime is required; start Docker Desktop and retry" >&2
    exit 2
fi

if [ "$#" -eq 0 ]; then
    set -- --area real-clients --area zai-only-entitlements
fi

mkdir -p "${output}"

forwarded=(--env ROUTER_REAL_CLIENT_TESTS=1
    --env "ROUTER_VERIFY_HOST_UID=$(id -u)"
    --env "ROUTER_REAL_CLIENT_CLAUDE_VERSION=${claude}"
    --env "ROUTER_REAL_CLIENT_CODEX_VERSION=${codex}"
    --env "ROUTER_REAL_CLIENT_OPENCODE_VERSION=${opencode}")
for name in ROUTER_LIVE_ZAI_API_KEY ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST \
    ROUTER_HOST_CLI_TESTS ROUTER_HOST_CLI_URL ROUTER_HOST_CLI_TOKEN; do
    if [ -n "${!name:-}" ]; then
        # `--env NAME` copies the value from this process without putting it
        # on the docker command line.
        forwarded+=(--env "${name}")
        echo "forwarding ${name}" >&2
    fi
done

# The checkout is mounted read-only and copied inside the container, so the
# Linux build never writes into the host's target/ directory and nothing from
# the host's home (including ~/.claude, ~/.codex and the Keychain) is visible.
docker run --rm --init \
    "${forwarded[@]}" \
    --volume "${repository}:/source:ro" \
    --volume "${output}:/output" \
    --workdir /work \
    "${image}" \
    bash -euo pipefail -c '
        export DEBIAN_FRONTEND=noninteractive
        apt-get update >/dev/null
        # procps provides the pgrep and ps that client lifecycle checks run.
        apt-get install -y --no-install-recommends ca-certificates curl git pkg-config libssl-dev nodejs npm procps >/dev/null
        npm install --global --silent \
            "@anthropic-ai/claude-code@${ROUTER_REAL_CLIENT_CLAUDE_VERSION}" \
            "@openai/codex@${ROUTER_REAL_CLIENT_CODEX_VERSION}" \
            "opencode-ai@${ROUTER_REAL_CLIENT_OPENCODE_VERSION}"
        # Vendor CLIs behave differently as root, and CI runs them as an
        # ordinary user, so the verifier does too.
        # Reuse the host uid so results under target/ stay owned by the
        # developer on a Linux host too (Docker Desktop maps them anyway).
        uid="${ROUTER_VERIFY_HOST_UID}"
        if [ "${uid}" = 0 ]; then uid=1000; fi
        useradd --create-home --uid "${uid}" verifier
        chown verifier /work
        if [ "$(stat -c %u /output)" != "${uid}" ]; then chown verifier /output; fi
        exec runuser -u verifier -- env HOME=/home/verifier CARGO_HOME=/home/verifier/.cargo \
            PATH="/home/verifier/.cargo/bin:${PATH}" bash -euo pipefail -c "
            cargo install rust-script --version 0.36.0 --locked --quiet
            git config --global init.defaultBranch main
            tar -C /source --exclude=./target --exclude=./ui/node_modules -cf - . | tar -xf -
            rust-script scripts/verify-contracts.rs --output /output/result.json \"\$@\"
        " verify-contracts-in-linux "$@"
    ' verify-contracts-in-linux "$@"
