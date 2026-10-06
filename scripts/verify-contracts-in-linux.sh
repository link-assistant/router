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
# container from npm at the host versions by default (or explicit CI/latest policy).
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
policy=installed
arguments=()
while [ "$#" -gt 0 ]; do
    case "$1" in
        --client-versions)
            [ "$#" -ge 2 ] || { echo "error: --client-versions needs ci|installed|latest" >&2; exit 2; }
            policy="$2"; shift 2 ;;
        --client-versions=*) policy="${1#*=}"; shift ;;
        *) arguments+=("$1"); shift ;;
    esac
done
case "${policy}" in installed|ci|latest) ;; *) echo "error: invalid client version policy: ${policy}" >&2; exit 2 ;; esac
set -- "${arguments[@]}"

# Only --version is run on the host. Bound a broken executable, and never pass
# credentials or launch an interactive session. Failed discovery is an error;
# only an absent executable qualifies for the documented CI-pin fallback.
discover_version() {
    local client="$1" file pid guard status=0
    command -v "${client}" >/dev/null 2>&1 || return 0
    file="$(mktemp)"
    "${client}" --version >"${file}" 2>&1 & pid=$!
    (
        sleep 15 & timer=$!
        trap 'kill "$timer" 2>/dev/null || true; exit 0' TERM
        wait "$timer" || true
        kill -KILL "${pid}" 2>/dev/null || true
    ) >/dev/null 2>&1 & guard=$!
    wait "${pid}" || status=$?
    kill "${guard}" 2>/dev/null || true
    wait "${guard}" 2>/dev/null || true
    if [ "${status}" -ne 0 ]; then
        rm -f "${file}"
        echo "error: ${client} --version failed or exceeded its 15-second deadline" >&2
        return 2
    fi
    sed -nE 's/^[^0-9]*([0-9]+\.[0-9]+\.[0-9]+).*$/\1/p' "${file}" | head -n 1
    rm -f "${file}"
}

forwarded=(--env ROUTER_REAL_CLIENT_TESTS=1
    --env "ROUTER_VERIFY_HOST_UID=$(id -u)")
clients=(claude codex opencode)
pins=(2.1.265 0.154.0 1.18.29)
variables=(ROUTER_REAL_CLIENT_CLAUDE ROUTER_REAL_CLIENT_CODEX ROUTER_REAL_CLIENT_OPENCODE)
for index in 0 1 2; do
    client="${clients[$index]}"
    prefix="${variables[$index]}"
    host_version="$(discover_version "${client}")"
    if command -v "${client}" >/dev/null 2>&1 && [ -z "${host_version}" ]; then
        echo "error: ${client} returned no semantic version" >&2; exit 2
    fi
    version_variable="${prefix}_VERSION"
    override="${!version_variable:-}"
    source=ci-pin
    version="${pins[$index]}"
    if [ "${policy}" = latest ]; then
        source=latest; version=latest
    elif [ "${policy}" = installed ] && [ -n "${host_version}" ]; then
        source=installed; version="${host_version}"
    elif [ "${policy}" = installed ]; then
        echo "warning: ${client} not installed on host; falling back to CI pin ${version}" >&2
    fi
    if [ -n "${override}" ]; then
        version="${override}"
        if [ "${version}" = latest ]; then source=latest
        elif [ "${version}" = "${host_version}" ]; then source=installed
        else source=ci-pin; fi
    fi
    if [ "${version}" != latest ] && ! [[ "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "error: invalid version for ${client}" >&2; exit 2
    fi
    echo "verify ${client}: selected=${version} source=${source} host=${host_version:-absent}" >&2
    if [ -n "${host_version}" ] && [ "${version}" != "${host_version}" ]; then
        echo "warning: ${client} proven selection ${version} differs from host ${host_version}" >&2
    fi
    forwarded+=(--env "${prefix}_VERSION=${version}" --env "${prefix}_SOURCE=${source}"
        --env "${prefix}_HOST_VERSION=${host_version}")
done

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    echo "error: a running Docker runtime is required; start Docker Desktop and retry" >&2
    exit 2
fi

if [ "$#" -eq 0 ]; then
    set -- --area real-clients --area zai-only-entitlements
fi

mkdir -p "${output}"

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
            tar -C /source --exclude=./target --exclude=./ui/node_modules \
                --exclude='./packages/*/node_modules' --exclude=./experiments/issue-697/venv \
                --exclude=./experiments/issue-697/tools -cf - . | tar -xf -
            rust-script scripts/verify-contracts.rs --output /output/result.json \"\$@\"
        " verify-contracts-in-linux "$@"
    ' verify-contracts-in-linux "$@"
