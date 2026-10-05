# Deploy settings (issues #679, #680, #683). The wrapper exports them as one
# base64 line, ROUTER_DEPLOY_PAYLOAD, read from stdin after the secret. Without
# settings it is unset and every name below keeps its historical value.
INSTANCE=
EVENTS=0
ENV_FINGERPRINT=
PROFILE=
TOKENS_LIMITED=0
SETTINGS_DIR=
EVENT_PREFIX='ROUTER_DEPLOY_EVENT '

now_ms() {
    now=$(date +%s%3N 2>/dev/null || true)
    case "$now" in
        ''|*[!0-9]*) now=$(($(date +%s) * 1000)) ;;
    esac
    printf '%s' "$now"
}

# Structured progress for `--json`, on a descriptor command substitutions
# never capture. Without `--json` nothing is written.
event() {
    [ "$EVENTS" = 1 ] || return 0
    printf '%s%s\n' "$EVENT_PREFIX" "$1" >&3
}

mark() {
    [ "$EVENTS" = 1 ] || return 0
    event "{\"event\":\"step\",\"name\":\"$1\",\"at_ms\":$(now_ms)}"
}

remove_settings() {
    if [ -n "$SETTINGS_DIR" ]; then rm -rf "$SETTINGS_DIR"; fi
}

if [ -n "${ROUTER_DEPLOY_PAYLOAD:-}" ]; then
    SETTINGS_DIR=$(mktemp -d "${TMPDIR:-/tmp}/router-deploy-settings.XXXXXX")
    trap remove_settings EXIT
    trap 'exit 130' HUP INT TERM
    printf '%s' "$ROUTER_DEPLOY_PAYLOAD" | base64 -d > "$SETTINGS_DIR/payload" || {
        echo "error: the deploy settings could not be decoded" >&2
        exit 2
    }
    unset ROUTER_DEPLOY_PAYLOAD
    : > "$SETTINGS_DIR/runtime.env"
    : > "$SETTINGS_DIR/keys"
    : > "$SETTINGS_DIR/token-args"
    while IFS=' ' read -r setting first second third fourth; do
        case "$setting" in
            instance)
                case "$first" in
                    ''|-*|*-|*[!a-z0-9-]*) echo "error: invalid deployment instance" >&2; exit 2 ;;
                esac
                INSTANCE=$first ;;
            json) EVENTS=1 ;;
            env)
                case "$first" in
                    ''|[0-9]*|*[!A-Za-z0-9_]*) echo "error: invalid runtime variable name" >&2; exit 2 ;;
                esac
                # Docker reads `NAME=value` literally; the value never
                # becomes an argument of any process.
                {
                    printf '%s=' "$first"
                    printf '%s' "$second" | base64 -d
                    printf '\n'
                } >> "$SETTINGS_DIR/runtime.env" ;;
            env-fingerprint) ENV_FINGERPRINT=$first ;;
            key)
                case "$first" in
                    ''|*[!A-Za-z0-9._-]*) echo "error: invalid provider name" >&2; exit 2 ;;
                esac
                case "$second" in
                    keep|if-absent|replace) ;;
                    *) echo "error: invalid provider key mode" >&2; exit 2 ;;
                esac
                printf '%s %s %s %s\n' "$first" "$second" "$third" "$fourth" >> "$SETTINGS_DIR/keys" ;;
            template)
                case "$first" in
                    ''|*[!A-Za-z0-9._-]*) echo "error: invalid provider name" >&2; exit 2 ;;
                esac
                printf '%s' "$second" | base64 -d > "$SETTINGS_DIR/template.$first" ;;
            profile)
                printf '%s' "$first" | base64 -d > "$SETTINGS_DIR/profile.json"
                PROFILE=$SETTINGS_DIR/profile.json ;;
            tokens) TOKENS_LIMITED=1 ;;
            token-arg)
                { printf '%s' "$first" | base64 -d; printf '\n'; } >> "$SETTINGS_DIR/token-args" ;;
            '') ;;
            *) echo "error: unknown deploy setting $setting" >&2; exit 2 ;;
        esac
    done < "$SETTINGS_DIR/payload"
    rm -f "$SETTINGS_DIR/payload"
fi
if [ "$EVENTS" = 1 ]; then exec 3>&2; fi
mark start

# Run Router inside the candidate against a private, empty data directory.
# Nothing it does reaches the shared store, the OAuth logins or a client.
PKV_PORT=18080
isolated() {
    pkv=/tmp/router-key-validation-$COOKIE
    docker exec -i -e "DATA_DIR=$pkv" -e "HOME=$pkv/home" \
        -e "CLAUDE_CODE_HOME=$pkv/home/.claude" -e "CLAUDE_CONFIG_DIR=$pkv/home/.claude" \
        -e "CODEX_HOME=$pkv/home/.codex" -e "GEMINI_CLI_HOME=$pkv/home" \
        -e "QWEN_HOME=$pkv/home/.qwen" -e "LISTENERS=127.0.0.1:$PKV_PORT=combined,http" \
        "$@"
}

stop_isolated() {
    docker exec "$CANDIDATE" sh -c \
        'if [ -r "$1/serve.pid" ]; then kill "$(cat "$1/serve.pid")" 2>/dev/null || true; fi; rm -rf "$1"' \
        sh "/tmp/router-key-validation-$COOKIE" >/dev/null 2>&1 || true
}

# Validate one key in an isolated Router, then install it per its mode.
provider_key() {
    key_name=$1
    key_mode=$2
    key_value=$3
    template=
    if [ -r "$SETTINGS_DIR/template.$key_name" ]; then template=$(cat "$SETTINGS_DIR/template.$key_name"); fi
    PKV_NAME=$key_name PKV_TEMPLATE=$template
    export PKV_NAME PKV_TEMPLATE
    plan=$(docker exec -i -e PKV_NAME -e PKV_TEMPLATE "$CANDIDATE" bun - <<'JS_PROVIDER_PLAN'
@@PROVIDER_KEY_PLAN@@
JS_PROVIDER_PLAN
    ) || { echo "error: provider key $key_name: could not read the provider record" >&2; return 1; }
    present=$(printf '%s\n' "$plan" | sed -n 's/^present //p')
    if [ "$key_mode" = if-absent ] && [ "$present" = 1 ]; then
        echo "provider key $key_name: provider present; if-absent leaves it unchanged"
        event "{\"event\":\"provider_key\",\"name\":\"$key_name\",\"action\":\"kept-existing\",\"validation\":{\"result\":\"skipped\",\"reason\":\"provider present\"}}"
        return 0
    fi
    set --
    while IFS= read -r line; do
        case "$line" in
            'arg '*) set -- "$@" "${line#arg }" ;;
        esac
    done <<EOF
$plan
EOF
    if [ "$#" -eq 0 ]; then
        validation='{"result":"negative","reason":"the target has no such provider and --config gives no [provider_keys] template"}'
    else
        stop_isolated
        docker exec "$CANDIDATE" sh -c 'mkdir -p "$1/home/.claude" "$1/home/.codex" "$1/home/.qwen"' \
            sh "/tmp/router-key-validation-$COOKIE" >/dev/null
        if ! printf '%s' "$key_value" | base64 -d |
            isolated "$CANDIDATE" router providers add --local --name "$key_name" "$@" --api-key-stdin >/dev/null; then
            validation='{"result":"negative","reason":"the isolated Router refused the provider record"}'
        else
            isolated -d "$CANDIDATE" sh -c 'echo $$ > "$DATA_DIR/serve.pid"; exec router serve'
            attempt=0
            until docker exec "$CANDIDATE" bun -e \
                "const r=await fetch('http://127.0.0.1:$PKV_PORT/api/health',{signal:AbortSignal.timeout(5000)});process.exit(r.status===200?0:1)" \
                >/dev/null 2>&1; do
                attempt=$((attempt + 1))
                [ "$attempt" -lt 60 ] || break
                sleep 1
            done
            PKV_ADMIN=$(isolated "$CANDIDATE" router tokens issue --admin --ttl-hours 1 \
                --label deploy-key-validation | grep -o 'la_sk_[A-Za-z0-9._-]*' | sed -n '1p')
            export PKV_ADMIN
            validation=$(docker exec -i -e PKV_ADMIN -e PKV_NAME -e "PKV_ORIGIN=http://127.0.0.1:$PKV_PORT" \
                "$CANDIDATE" bun - <<'JS_PROVIDER_CHECK'
@@PROVIDER_KEY_CHECK@@
JS_PROVIDER_CHECK
            ) || validation='{"result":"negative","reason":"the validation request could not run"}'
            unset PKV_ADMIN
        fi
        stop_isolated
    fi
    case "$validation" in
        *'"result":"positive"'*) positive=1 ;;
        *) positive=0 ;;
    esac
    action=validated
    if [ "$positive" = 1 ] && [ "$key_mode" != keep ]; then
        absent_flag=
        if [ "$key_mode" = if-absent ]; then absent_flag=--if-absent; fi
        printf '%s' "$key_value" | base64 -d |
            docker exec -i "$CANDIDATE" router providers add --local --name "$key_name" "$@" \
                --api-key-stdin $absent_flag >/dev/null
        if [ "$present" = 1 ]; then action=replaced; else action=created; fi
    elif [ "$positive" = 0 ] && [ "$key_mode" != keep ]; then
        action=refused
    fi
    echo "provider key $key_name ($key_mode): $action"
    event "{\"event\":\"provider_key\",\"name\":\"$key_name\",\"action\":\"$action\",\"validation\":$validation}"
    if [ "$action" = refused ]; then
        echo "error: provider key $key_name did not validate; the stored key was not changed and the old backend is retained" >&2
        return 1
    fi
    if [ "$positive" = 0 ]; then
        echo "warning: provider key $key_name did not validate (keep mode changes nothing)" >&2
    fi
    return 0
}

provider_keys_step() {
    if [ -z "$SETTINGS_DIR" ] || [ ! -s "$SETTINGS_DIR/keys" ]; then return 0; fi
    mark provider-keys
    while IFS=' ' read -r name mode value _fingerprint; do
        provider_key "$name" "$mode" "$value" < /dev/null || return 1
    done < "$SETTINGS_DIR/keys"
    rm -f "$SETTINGS_DIR/keys"
    unset PKV_NAME PKV_TEMPLATE
}

# Issue the deployment's bounded client token once (issue #679): only with a
# configured token policy, and only when no unrevoked `deploy` token exists.
deploy_token_step() {
    [ "$TOKENS_LIMITED" = 1 ] || return 0
    mark deploy-token
    if docker exec "$CANDIDATE" sh -c 'router tokens list --json' 2>/dev/null |
        docker exec -i "$CANDIDATE" bun -e '
const rows=JSON.parse(await Bun.stdin.text());
process.exit(rows.some(r=>r.label==="deploy"&&!r.revoked)?0:1)' >/dev/null 2>&1; then
        event '{"event":"token","action":"present"}'
        return 0
    fi
    set --
    while IFS= read -r argument; do
        if [ -n "$argument" ]; then set -- "$@" "$argument"; fi
    done < "$SETTINGS_DIR/token-args"
    if docker exec "$CANDIDATE" router tokens issue --label deploy "$@" >/dev/null 2>&1; then
        echo "issued deploy client token (value withheld)"
        event '{"event":"token","action":"issued"}'
    else
        echo "warning: the deploy client token could not be issued" >&2
        event '{"event":"token","action":"failed"}'
    fi
}

# Report the verification profile's outcome, read from the verifier output.
report_profile() {
    result=$(printf '%s\n' "$1" | sed -n 's/^PROFILE_RESULT //p' | sed -n '1p')
    [ -n "$result" ] || return 0
    echo "verification profile: $(printf '%s' "$result" | grep -o '"status":"[a-z-]*"' | sed -n '1p')"
    event "{\"event\":\"verification\",\"result\":$result}"
}
