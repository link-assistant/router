from pathlib import Path
p=Path('scripts/verify-contracts-in-linux.sh')
s=p.read_text().replace('container from npm at the pinned versions CI uses.', 'container from npm at the host versions by default (or explicit CI/latest policy).')
a=s.index('claude="${ROUTER_REAL_CLIENT_CLAUDE_VERSION')
b=s.index('\nif ! command -v docker', a)
s=s[:a]+'''policy=installed
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
    (sleep 15; kill -TERM "${pid}" 2>/dev/null || true) & guard=$!
    wait "${pid}" || status=$?
    kill "${guard}" 2>/dev/null || true
    wait "${guard}" 2>/dev/null || true
    if [ "${status}" -ne 0 ]; then
        rm -f "${file}"
        echo "error: ${client} --version failed or exceeded its 15-second deadline" >&2
        return 2
    fi
    sed -nE 's/^[^0-9]*([0-9]+\\.[0-9]+\\.[0-9]+).*$/\\1/p' "${file}" | head -n 1
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
    case "${version}" in
        latest) ;;
        *[!0-9.]*|'' ) echo "error: invalid version for ${client}" >&2; exit 2 ;;
    esac
    echo "verify ${client}: selected=${version} source=${source} host=${host_version:-absent}" >&2
    if [ -n "${host_version}" ] && [ "${version}" != "${host_version}" ]; then
        echo "warning: ${client} proven selection ${version} differs from host ${host_version}" >&2
    fi
    forwarded+=(--env "${prefix}_VERSION=${version}" --env "${prefix}_SOURCE=${source}"
        --env "${prefix}_HOST_VERSION=${host_version}")
done
''' + s[b:]
a=s.index('forwarded=(--env ROUTER_REAL_CLIENT_TESTS=1', s.index('mkdir -p'))
b=s.index('for name in ROUTER_LIVE',a)
s=s[:a]+s[b:]
# Resolve latest before Cargo compiles pins: npm knows the exact installed release.
needle='''        # Vendor CLIs behave differently as root'''
s=s.replace(needle,'''        if [ "${ROUTER_REAL_CLIENT_CLAUDE_VERSION}" = latest ]; then
            export ROUTER_REAL_CLIENT_CLAUDE_VERSION="$(npm list -g --json | node -e '\''let s="";process.stdin.on("data",x=>s+=x).on("end",()=>console.log(JSON.parse(s).dependencies["@anthropic-ai/claude-code"].version))'\'')"
        fi
        if [ "${ROUTER_REAL_CLIENT_CODEX_VERSION}" = latest ]; then
            export ROUTER_REAL_CLIENT_CODEX_VERSION="$(npm list -g --json | node -e '\''let s="";process.stdin.on("data",x=>s+=x).on("end",()=>console.log(JSON.parse(s).dependencies["@openai/codex"].version))'\'')"
        fi
        if [ "${ROUTER_REAL_CLIENT_OPENCODE_VERSION}" = latest ]; then
            export ROUTER_REAL_CLIENT_OPENCODE_VERSION="$(npm list -g --json | node -e '\''let s="";process.stdin.on("data",x=>s+=x).on("end",()=>console.log(JSON.parse(s).dependencies["opencode-ai"].version))'\'')"
        fi
''' + needle)
p.write_text(s)
