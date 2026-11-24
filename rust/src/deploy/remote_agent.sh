#!/bin/sh
# Target half of `router deploy --server`. It is embedded in the binary and is
# sent on stdin, so the target needs no installed Router agent. Its host-side
# dependencies are POSIX sh/core utilities, util-linux flock, GNU timeout, base64, Docker,
# and git for the default release-tag build.

set -eu
umask 077

# Own a finite Docker process group. Never recover or restart the daemon.
command -v timeout >/dev/null 2>&1 || {
    echo 'error: GNU timeout is required for bounded deployment diagnostics' >&2
    exit 1
}
docker() {
    budget=30
    case "$1" in build|pull) budget=900;; esac
    if [ "${EVENTS:-0}" != 1 ]; then
        command timeout --kill-after=5s "${budget}s" docker "$@"
        return
    fi
    docker_started=$(now_ms)
    docker_status=0
    command timeout --kill-after=5s "${budget}s" docker "$@" || docker_status=$?
    event "{\"event\":\"subprocess\",\"program\":\"docker\",\"command\":\"$1\",\"started_ms\":$docker_started,\"duration_ms\":$(($(now_ms) - docker_started)),\"exit_code\":$docker_status}"
    return "$docker_status"
}

MODE=$1
COOKIE=$2
VERSION=$3
IMAGE=$4
BUILD_MODE=$5
BUILD_VALUE=$6
ROOT_ARGUMENT=$7
MANAGEMENT_PORT=$8
PUBLIC_PORT=$9
shift 9
PUBLIC_NAME=$1

@@DEPLOY_SETTINGS@@

LEASE_EXIT=73
OWNER_LABEL=com.link-assistant.router.remote-deploy
RELAY=router-deploy-relay${INSTANCE:+-$INSTANCE}
NETWORK=router-deploy-network${INSTANCE:+-$INSTANCE}

case "$COOKIE" in
    *[!A-Za-z0-9-]*|'') echo "error: invalid deployment cookie" >&2; exit 2 ;;
esac
# Validate and bound the routing label before acquiring state or mutating Docker.
case "$INSTANCE" in
    *[!a-z0-9-]*|-*|*-) echo "error: invalid deployment instance" >&2; exit 2 ;;
esac
[ "${#INSTANCE}" -le 32 ] || { echo "error: deployment instance exceeds 32 characters" >&2; exit 2; }
INSTANCE_DNS=
if [ -n "$INSTANCE" ]; then
    INSTANCE_DNS=$(printf '%s' "$INSTANCE" | sha256sum | cut -c1-8)
fi
CANDIDATE=router-deploy-${INSTANCE_DNS:+$INSTANCE_DNS-}$COOKIE
[ "${#CANDIDATE}" -le 63 ] || { echo "error: deployment backend exceeds the DNS label limit" >&2; exit 2; }
case "$PUBLIC_NAME" in
    *[!A-Za-z0-9._:-]*|'') echo "error: invalid deployment public host name" >&2; exit 2 ;;
esac
if [ -n "$ROOT_ARGUMENT" ]; then
    ROOT=$ROOT_ARGUMENT
else
    ROOT=${XDG_DATA_HOME:-"$HOME/.local/share"}/link-assistant-router/deploy${INSTANCE:+-$INSTANCE}
fi
# Quoted argv deliberately bypasses the caller's shell. Expand only the
# supported home prefix here, against the target user's home, without eval.
case "$ROOT" in
    '~') ROOT=$HOME ;;
    '~/'*) ROOT=$HOME/${ROOT#\~/} ;;
    '~'*) echo "error: deployment paths support only ~ or ~/; use an absolute path" >&2; exit 2 ;;
esac
case "$ROOT" in
    /*) ;;
    *) echo "error: remote deployment root must be absolute: $ROOT" >&2; exit 2 ;;
esac
case "$ROOT" in
    /|/bin|/boot|/dev|/etc|/home|/lib|/lib64|/opt|/proc|/root|/run|/sbin|/srv|/sys|/tmp|/usr|/var)
        echo "error: refusing broad remote deployment root $ROOT" >&2
        exit 2
        ;;
esac

docker_label() {
    docker inspect --format "{{index .Config.Labels \"$1\"}}" "$2" 2>/dev/null || true
}

owned_container() {
    [ "$(docker_label "$OWNER_LABEL" "$1")" = 1 ] &&
        [ "$(docker_label "$OWNER_LABEL.root" "$1")" = "$ROOT" ]
}

owned_network() {
    [ "$(docker network inspect --format "{{index .Labels \"$OWNER_LABEL\"}}" "$1" 2>/dev/null || true)" = 1 ] &&
        [ "$(docker network inspect --format "{{index .Labels \"$OWNER_LABEL.root\"}}" "$1" 2>/dev/null || true)" = "$ROOT" ]
}

status() {
    # Read-only by construction: no mkdir, lock, touch, pull, or start occurs
    # on this path. Docker inspect is also non-mutating.
    echo "target root: $ROOT"
    if [ ! -r "$ROOT/state/current" ]; then
        echo "deployment: absent"
        return 1
    fi
    current=$(sed -n '1p' "$ROOT/state/current")
    if ! owned_container "$current"; then
        echo "deployment: inconsistent (current backend is not owned: $current)"
        return 1
    fi
    running=$(docker inspect --format '{{.State.Running}}' "$current" 2>/dev/null || true)
    image=$(docker inspect --format '{{.Image}}' "$current" 2>/dev/null || true)
    if ! owned_container "$RELAY"; then
        echo "deployment: inconsistent (relay is not owned: $RELAY)"
        return 1
    fi
    relay_running=$(docker inspect --format '{{.State.Running}}' "$RELAY" 2>/dev/null || true)
    echo "deployment: $current"
    echo "backend running: $running"
    echo "image id: $image"
    echo "relay running: $relay_running"
    [ "$running" = true ] && [ "$relay_running" = true ]
}

if [ "$MODE" = status ]; then
    mark status
    status_code=0
    status || status_code=$?
    mark complete
    exit "$status_code"
fi

if [ "$MODE" = down ] && [ ! -d "$ROOT" ]; then
    echo "deployment is already absent; target state root does not exist: $ROOT"
    exit 0
fi

mkdir -p "$ROOT"
chmod 700 "$ROOT" 2>/dev/null || true
BOOT_ID=$(cat /proc/sys/kernel/random/boot_id) || {
    echo "lease error: cannot read the target boot id" >&2
    exit "$LEASE_EXIT"
}
SELF_UID=$(awk '/^Uid:/{print $2; exit}' /proc/self/status)
SELF_GID=$(awk '/^Gid:/{print $2; exit}' /proc/self/status)

process_start() {
    # Everything before the last ')' is the process name and may contain
    # spaces or parentheses. Field 22 is field 20 after it.
    line=$(cat "/proc/$1/stat" 2>/dev/null) || return 1
    rest=${line##*) }
    set -- $rest
    [ "$#" -ge 20 ] || return 1
    eval "printf '%s\n' \${20}"
}

cookie_process_exists() {
    wanted="ROUTER_DEPLOY_COOKIE=$1"
    for process in /proc/[0-9]*; do
        [ -d "$process" ] || continue
        uid=$(awk '/^Uid:/{print $2; exit}' "$process/status" 2>/dev/null || true)
        [ "$uid" = "$SELF_UID" ] || continue
        if [ ! -r "$process/environ" ]; then
            # Acquiring the kernel lease proves that no child still holds the
            # inherited FD. Cookie inspection catches readable work that
            # deliberately closed it; unrelated non-dumpable processes owned
            # by this user do not make reclamation impossible forever.
            continue
        fi
        if tr '\000' '\n' < "$process/environ" 2>/dev/null | grep -Fqx "$wanted"; then
            return 0
        fi
    done
    return 1
}

write_lease_record() {
    destination=$1
    start=$(process_start $$) || {
        echo "lease error: cannot read this process's start time" >&2
        exit "$LEASE_EXIT"
    }
    printf '%s %s %s %s\n' "$$" "$start" "$BOOT_ID" "$COOKIE" > "$destination"
}

acquire_lease() {
    command -v flock >/dev/null 2>&1 || {
        echo "lease error: util-linux flock is required on the target" >&2
        exit "$LEASE_EXIT"
    }
    # The kernel lock is the exclusion primitive; the adjacent identity is the
    # durable explanation. FD 9 is inherited by spawned work, so killing this
    # shell cannot release the lease while a build or copy child is still alive.
    exec 9> "$ROOT/lease.kernel" || {
        echo "lease error: cannot open the target lease" >&2
        exit "$LEASE_EXIT"
    }
    while :; do
        if flock -n 9; then
            if [ -r "$ROOT/lease.owner" ] &&
                IFS=' ' read -r pid start boot cookie < "$ROOT/lease.owner"; then
                case "$cookie" in *[!A-Za-z0-9-]*|'')
                    echo "lease error: target lease has an invalid owner cookie" >&2
                    flock -u 9
                    exit "$LEASE_EXIT" ;;
                esac
                case "$pid:$start" in *[!0-9:]*|:*|*:)
                    echo "lease error: target lease has an invalid process identity" >&2
                    flock -u 9
                    exit "$LEASE_EXIT" ;;
                esac
                if [ "$boot" = "$BOOT_ID" ] && [ "$cookie" != "$COOKIE" ]; then
                    cookie_process_exists "$cookie" && cookie_state=0 || cookie_state=$?
                    if [ "$cookie_state" -eq 0 ]; then
                        echo "waiting for work owned by expired lease cookie $cookie" >&2
                        flock -u 9
                        sleep 1
                        continue
                    fi
                    if [ "$cookie_state" -eq 2 ]; then
                        echo "lease error: cannot prove the previous holder's process tree is gone" >&2
                        flock -u 9
                        exit "$LEASE_EXIT"
                    fi
                fi
                # A process cannot survive a boot-id change. Its durable record
                # is ignored once the kernel says the lock itself is free.
            elif [ -e "$ROOT/lease.owner" ]; then
                echo "lease error: target lease has no readable owner identity" >&2
                flock -u 9
                exit "$LEASE_EXIT"
            fi
            next_owner=$ROOT/lease.owner.next.$COOKIE.$$
            write_lease_record "$next_owner"
            mv "$next_owner" "$ROOT/lease.owner"
            return 0
        fi
        if [ -r "$ROOT/lease.owner" ] &&
            IFS=' ' read -r pid _start _boot _cookie < "$ROOT/lease.owner"; then
            echo "waiting for target deployment lease held by pid $pid" >&2
        else
            # The holder may have acquired the kernel lock immediately before
            # publishing its atomic identity. The lock itself proves it exists.
            echo "waiting for target deployment lease identity" >&2
        fi
        sleep 1
    done
}

release_lease() {
    if [ -r "$ROOT/lease.owner" ]; then
        owner_pid=$(awk '{print $1}' "$ROOT/lease.owner" 2>/dev/null || true)
        owner_cookie=$(awk '{print $4}' "$ROOT/lease.owner" 2>/dev/null || true)
        if [ "$owner_pid" = "$$" ] && [ "$owner_cookie" = "$COOKIE" ]; then
            rm -f "$ROOT/lease.owner"
        fi
    fi
    flock -u 9 2>/dev/null || true
    exec 9>&-
    remove_settings
}

export ROUTER_DEPLOY_COOKIE=$COOKIE
mark lease
acquire_lease
trap release_lease EXIT
trap 'exit 130' HUP INT TERM

if [ "$MODE" = down ]; then
    containers=$(docker ps -a --filter "label=$OWNER_LABEL=1" \
        --filter "label=$OWNER_LABEL.root=$ROOT" --format '{{.Names}}')
    for container in $containers; do
        if owned_container "$container"; then
            docker rm -f "$container" >/dev/null
            echo "removed $container"
        fi
    done
    if owned_network "$NETWORK"; then
        docker network rm "$NETWORK" >/dev/null 2>&1 || true
    fi
    rm -f "$ROOT/state/current" "$ROOT/state/active" "$ROOT/state/transaction"
    echo "deployment is down; retained target state at $ROOT"
    exit 0
fi

if [ -z "$TOKEN_SECRET" ]; then
    echo "error: TOKEN_SECRET is required to deploy on the target" >&2
    exit 2
fi

STATE=$ROOT/state
RELEASES=$ROOT/releases
RELEASE=$RELEASES/$COOKIE
TRANSACTION=$STATE/transaction
mkdir -p "$STATE" "$RELEASES" "$RELEASE/home" "$RELEASE/data"

sign_stream() {
    # A keyed, target-local integrity seal. The key arrives over SSH stdin and
    # is neither persisted nor placed in argv.
    { printf '%s\000' "$TOKEN_SECRET"; cat; printf '\000%s' "$TOKEN_SECRET"; } | sha256sum | awk '{print $1}'
}

write_signed() {
    destination=$1
    unsigned="$destination.unsigned.$$"
    temporary="$destination.tmp.$$"
    cat > "$unsigned"
    signature=$(sign_stream < "$unsigned")
    { cat "$unsigned"; printf 'signature=%s\n' "$signature"; } > "$temporary"
    chmod 600 "$temporary"
    mv "$temporary" "$destination"
    rm -f "$unsigned"
}

verify_signed() {
    document=$1
    [ -r "$document" ] || return 1
    expected=$(sed -n '$s/^signature=//p' "$document")
    unsigned="$document.verify.$$"
    sed '$d' "$document" > "$unsigned"
    actual=$(sign_stream < "$unsigned")
    rm -f "$unsigned"
    [ -n "$expected" ] && [ "$expected" = "$actual" ]
}

field() {
    sed -n "s/^$2=//p" "$1" | sed -n '1p'
}

remove_owned_candidate() {
    container=$1
    case "$container" in router-deploy-[A-Za-z0-9-]*) ;;
        *) echo "error: unsafe recorded candidate name" >&2; return 1 ;;
    esac
    if owned_container "$container"; then
        docker rm -f "$container" >/dev/null 2>&1 || true
    fi
}

remove_release_root() {
    release_root=$1
    suffix=${release_root#"$RELEASES/"}
    if [ "$suffix" = "$release_root" ]; then
        echo "error: recorded release root is outside this deployment" >&2
        return 1
    fi
    case "$suffix" in
        *[!A-Za-z0-9-]*|'') echo "error: unsafe recorded release root" >&2; return 1 ;;
    esac
    rm -rf "$release_root"
}

recover_transaction() {
    [ -r "$TRANSACTION" ] || return 0
    if ! verify_signed "$TRANSACTION"; then
        echo "error: interrupted deployment record has an invalid signature" >&2
        exit 1
    fi
    phase=$(field "$TRANSACTION" phase)
    previous=$(field "$TRANSACTION" previous_container)
    previous_root=$(field "$TRANSACTION" previous_root)
    interrupted=$(field "$TRANSACTION" candidate_container)
    interrupted_root=$(field "$TRANSACTION" candidate_root)
    current=$(sed -n '1p' "$STATE/current" 2>/dev/null || true)
    case "$phase" in
        candidate|swapped|post-verify|rollback)
            # Until live verification has been durably accepted, a pointer
            # already moved to the candidate must return to the exact recorded
            # predecessor. This includes the SIGKILL window between the atomic
            # rename and the following transaction write.
            if [ "$current" = "$interrupted" ]; then
                if [ -n "$previous" ]; then
                    owned_container "$previous" || {
                        echo "error: cannot restore the recorded previous container $previous" >&2
                        exit 1
                    }
                    printf '%s\n' "$previous" > "$STATE/current.rollback.$$"
                    mv "$STATE/current.rollback.$$" "$STATE/current"
                    echo "rolled an interrupted cutover back to $previous"
                else
                    if docker inspect "$RELAY" >/dev/null 2>&1; then
                        owned_container "$RELAY" || {
                            echo "error: refusing an unowned relay during first-deploy recovery" >&2
                            exit 1
                        }
                        docker rm -f "$RELAY" >/dev/null 2>&1 || true
                    fi
                    rm -f "$STATE/current"
                fi
            elif [ "$current" != "$previous" ]; then
                echo "error: interrupted transaction disagrees with relay state" >&2
                exit 1
            fi
            while [ "$(cat "$STATE/connections/$interrupted" 2>/dev/null || echo 0)" != 0 ]; do
                sleep 1
            done
            remove_owned_candidate "$interrupted"
            remove_release_root "$interrupted_root"
            ;;
        accepted)
            # Live verification completed before this phase was signed. Finish
            # the old-backend drain/removal idempotently and retain the accepted
            # candidate even if the previous process died midway through it.
            [ "$current" = "$interrupted" ] && owned_container "$interrupted" || {
                echo "error: accepted transaction has no matching live candidate" >&2
                exit 1
            }
            if [ -n "$previous" ]; then
                while [ "$(cat "$STATE/connections/$previous" 2>/dev/null || echo 0)" != 0 ]; do
                    sleep 1
                done
                remove_owned_candidate "$previous"
                if [ -n "$previous_root" ]; then remove_release_root "$previous_root"; fi
            fi
            accepted_image=$(field "$TRANSACTION" candidate_image)
            accepted_revision=$(field "$TRANSACTION" source_revision)
            accepted_management_port=$(field "$TRANSACTION" management_port)
            accepted_public_port=$(field "$TRANSACTION" public_port)
            write_signed "$STATE/active" <<EOF
container=$interrupted
release_root=$interrupted_root
image=$accepted_image
source_revision=$accepted_revision
management_port=$accepted_management_port
public_port=$accepted_public_port
EOF
            write_signed "$TRANSACTION" <<EOF
phase=complete
previous_container=$previous
previous_root=$previous_root
candidate_container=$interrupted
candidate_root=$interrupted_root
candidate_image=$accepted_image
source_revision=$accepted_revision
management_port=$accepted_management_port
public_port=$accepted_public_port
EOF
            echo "finished interrupted accepted deployment $interrupted"
            ;;
        complete|aborted) ;;
        *) echo "error: interrupted deployment record has unknown phase $phase" >&2; exit 1 ;;
    esac
}

recover_transaction

share_holding() {
    provider=$1
    source=$2
    directory=$3
    shift 3
    present=0
    for filename in "$@"; do
        if [ -f "$source/$filename" ]; then present=1; fi
    done
    if [ "$present" -eq 0 ]; then
        mkdir -p "$RELEASE/home/$directory"
        printf '%s\twithdrawn\t%s\t-\n' "$provider" "$source" >> "$HOLDINGS"
        return 0
    fi
    [ -d "$source" ] && [ -r "$source" ] && [ -w "$source" ] || {
        echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","reason":"live credential directory is not readable and writable; refresh ownership cannot be preserved"}' >&2
        exit 1
    }
    # Bind the whole original directory, including its durable refresh lock.
    # Individual file mounts break on atomic rename; snapshots fork OAuth.
    printf '%s\tpresent\t%s\tshared-original-directory\n' "$provider" "$source" >> "$HOLDINGS"
}

claude_home=${CLAUDE_CODE_HOME:-"$HOME/.claude"}
codex_home=${CODEX_HOME:-"$HOME/.codex"}

# `--seed-credential` (issue #681): install a login handed over by the
# coordinator, the way `auth import --if-absent` would — never over a login
# the target already holds — before the live directories are shared with the
# candidate. A receipt keyed by the refresh chain's fingerprint makes a re-run,
# or a re-run after a lost response, a no-op that still reports success.
seed_credentials_step() {
    if [ -z "$SETTINGS_DIR" ] || [ ! -s "$SETTINGS_DIR/seeds" ]; then return 0; fi
    mark seed-credentials
    mkdir -p "$STATE/seed-receipts"
    while IFS=' ' read -r seed_provider seed_document seed_fingerprint; do
        case "$seed_provider" in
            claude) seed_home=$claude_home; seed_file=.credentials.json
                set -- .credentials.json credentials.json auth.json oauth.json ;;
            codex) seed_home=$codex_home; seed_file=auth.json; set -- auth.json ;;
        esac
        receipt=$STATE/seed-receipts/$seed_provider
        seed_present=0
        for filename in "$@"; do
            if [ -f "$seed_home/$filename" ]; then seed_present=1; fi
        done
        if [ -r "$receipt" ] && [ "$(cat "$receipt")" = "$seed_fingerprint" ]; then
            seed_action=already-seeded
        elif [ "$seed_present" = 1 ]; then
            seed_action=kept-existing
        else
            mkdir -p "$seed_home" && chmod 700 "$seed_home" || return 1
            seed_temporary="$seed_home/.$seed_file.seed.$$"
            printf '%s' "$seed_document" | base64 -d > "$seed_temporary" || {
                rm -f "$seed_temporary"
                echo "error: seed credential $seed_provider could not be decoded" >&2
                return 1
            }
            chmod 600 "$seed_temporary" && mv "$seed_temporary" "$seed_home/$seed_file" || return 1
            # The receipt is written only after the login is in place, so a
            # receipt always means "this chain is installed here".
            { printf '%s\n' "$seed_fingerprint" > "$receipt.tmp.$$" &&
                mv "$receipt.tmp.$$" "$receipt"; } || return 1
            seed_action=imported
        fi
        echo "seed credential $seed_provider: $seed_action"
        event "{\"event\":\"seed_credential\",\"provider\":\"$seed_provider\",\"fingerprint\":\"$seed_fingerprint\",\"action\":\"$seed_action\"}"
    done < "$SETTINGS_DIR/seeds"
    rm -f "$SETTINGS_DIR/seeds"
}
seed_credentials_step || exit 1

HOLDINGS=$RELEASE/credential-holdings.unsigned
: > "$HOLDINGS"
gemini_home=${GEMINI_HOME:-"${GEMINI_CLI_HOME:-$HOME}/.gemini"}
qwen_home=${QWEN_HOME:-"$HOME/.qwen"}
share_holding claude "$claude_home" .claude .credentials.json credentials.json auth.json oauth.json config.json
share_holding codex "$codex_home" .codex auth.json
share_holding gemini "$gemini_home" .gemini oauth_creds.json
share_holding qwen "$qwen_home" .qwen oauth_creds.json
write_signed "$RELEASE/credential-holdings" < "$HOLDINGS"
rm -f "$HOLDINGS"

old_container=$(sed -n '1p' "$STATE/current" 2>/dev/null || true)
old_root=
if [ -r "$STATE/active" ] && verify_signed "$STATE/active"; then
    old_root=$(field "$STATE/active" release_root)
    recorded_old=$(field "$STATE/active" container)
    [ -z "$old_container" ] || [ "$old_container" = "$recorded_old" ] || {
        echo "error: active record disagrees with relay state" >&2
        exit 1
    }
    old_container=$recorded_old
fi

if [ -n "$old_root" ] && [ -r "$old_root/credential-holdings" ]; then
    # Previous versions refreshed a private snapshot. Neither the host copy
    # nor the snapshot can be chosen as current authority without evidence.
    if ! grep -q 'shared-original-directory' "$old_root/credential-holdings" &&
        grep -q 'present' "$old_root/credential-holdings"; then
        echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","reason":"legacy remote OAuth snapshot has an unproven refresh owner; no credentials copied and no cutover attempted"}' >&2
        exit 1
    fi
fi
if [ -n "$old_root" ] && [ -r "$old_root/credential-holdings" ]; then
    verify_signed "$old_root/credential-holdings" || {
        echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","reason":"credential-source journal integrity cannot be established"}' >&2
        exit 1
    }
    for provider in claude codex gemini qwen; do
        previous_source=$(awk -F '\t' -v p="$provider" '$1==p && $2=="present" {print $3; exit}' "$old_root/credential-holdings")
        case "$provider" in claude) source=$claude_home;; codex) source=$codex_home;; gemini) source=$gemini_home;; qwen) source=$qwen_home;; esac
        if [ -n "$previous_source" ] && [ "$previous_source" != "$source" ]; then
            echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","reason":"live credential directory changed; source connection would be lost"}' >&2
            exit 1
        fi
    done
fi
preservation_catalogs() {
    docker exec "$1" bun -e '
const {spawnSync}=require("node:child_process");const {createHmac}=require("node:crypto");
const inventory=spawnSync("router",["tokens","list","--json"],{encoding:"utf8",timeout:15000});
if(inventory.status!==0)throw Error("issued-token inventory unavailable");
const report=JSON.parse(inventory.stdout);const rows=Array.isArray(report)?report:report.success===true&&report.operation==="tokens.list"?report.data:null;
if(!Array.isArray(rows))throw Error("issued-token inventory contract invalid");
const now=Math.floor(Date.now()/1000);const records=rows.filter(t=>!t.revoked&&t.expires_at>now&&t.client_kind&&t.principal_id);
if(records.length>512)throw Error("issued-token inventory exceeds bounded verification budget");const catalogs=[];
for(const t of records){const claims={sub:t.id,iat:t.issued_at,exp:t.expires_at,label:t.label,scope:t.scope||"",github_repos:t.github_repos||[],client_kind:t.client_kind,principal_id:t.principal_id};
const header=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url");const body=Buffer.from(JSON.stringify(claims)).toString("base64url");const payload=header+"."+body;
const token="la_sk_"+payload+"."+createHmac("sha256",process.env.TOKEN_SECRET).update(payload).digest("base64url");
const response=await fetch("http://127.0.0.1:8080/api/models",{signal:AbortSignal.timeout(5000),headers:{authorization:"Bearer "+token}});
if(response.status!==200)throw Error("issued-token catalog unavailable: "+t.id);
const catalog=await response.json();if(!Array.isArray(catalog.data))throw Error("model catalog invalid");
catalogs.push({token_id:t.id,client_kind:t.client_kind,models:catalog.data.map(m=>String(m.owned_by||"")+"/"+m.id).sort()});}
console.log(JSON.stringify(catalogs));' 2>/dev/null
}
if [ -n "$old_container" ]; then
    ROUTER_EXPECTED_SECRET=$TOKEN_SECRET
    export ROUTER_EXPECTED_SECRET
    if ! docker exec -e ROUTER_EXPECTED_SECRET "$old_container" bun -e 'const {createHmac}=require("node:crypto");const f=s=>createHmac("sha256",s).update("router-preservation-secret-v1").digest("hex");process.exit(f(process.env.TOKEN_SECRET)===f(process.env.ROUTER_EXPECTED_SECRET)?0:2)' >/dev/null 2>&1; then
        echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","reason":"signing secret continuity failed; old tokens would be rejected"}' >&2
        exit 1
    fi
    unset ROUTER_EXPECTED_SECRET
    if ! preservation_catalogs "$old_container" > "$RELEASE/preservation-before.json"; then
        echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","reason":"old token-authorized catalog cannot be established; no candidate or cutover attempted"}' >&2
        exit 1
    fi
    # Export recoverable data before even preparing the candidate. OAuth homes
    # remain on their original owner and are deliberately outside this scope.
    if ! docker exec -i "$old_container" bun - <<'JS_CHECKPOINT'
@@DATA_CHECKPOINT@@
JS_CHECKPOINT
    then
        echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","blocker":"data-checkpoint","reason":"recoverable non-OAuth data checkpoint failed (its path and budget are printed above); no candidate or cutover attempted"}' >&2
        exit 1
    fi
else
    printf '[]\n' > "$RELEASE/preservation-before.json"
fi
SHARED_DATA=$ROOT/data
if [ -n "$old_root" ] && [ -d "$old_root/data" ] && [ ! -L "$old_root/data" ] && [ ! -e "$SHARED_DATA" ]; then
    # Same-filesystem rename keeps the mounted directory inode and live data.
    mv "$old_root/data" "$SHARED_DATA"
    ln -s "$SHARED_DATA" "$old_root/data"
fi
mkdir -p "$SHARED_DATA"
rmdir "$RELEASE/data"
ln -s "$SHARED_DATA" "$RELEASE/data"
if [ -z "$old_root" ]; then
    parent_data=${XDG_DATA_HOME:-"$HOME/.local/share"}/link-assistant-router
    if [ -f "$parent_data/providers.lenv" ]; then
        cp -p "$parent_data/providers.lenv" "$SHARED_DATA/providers.lenv"
    fi
fi

mark build
case "$BUILD_MODE" in
    release)
        command -v git >/dev/null 2>&1 || { echo "error: git is required on the target" >&2; exit 1; }
        source_dir=$RELEASE/source
        git clone --quiet --depth 1 --branch "v$VERSION" \
            https://github.com/link-assistant/router.git "$source_dir"
        git -C "$source_dir" tag --points-at HEAD | grep -Fx "v$VERSION" >/dev/null || {
            echo "error: checked-out source is not pinned release tag v$VERSION" >&2
            exit 1
        }
        docker build -t "$IMAGE" "$source_dir"
        source_revision=$(git -C "$source_dir" rev-parse HEAD)
        ;;
    path)
        case "$BUILD_VALUE" in /*) ;; *) echo "error: target build path must be absolute" >&2; exit 2;; esac
        docker build -t "$IMAGE" "$BUILD_VALUE"
        source_revision="target-path:$BUILD_VALUE"
        ;;
    pull)
        docker pull "$IMAGE"
        source_revision="registry:$IMAGE"
        ;;
    *) echo "error: unknown target build mode $BUILD_MODE" >&2; exit 2 ;;
esac
image_id=$(docker image inspect --format '{{.Id}}' "$IMAGE")

if docker network inspect "$NETWORK" >/dev/null 2>&1; then
    owned_network "$NETWORK" || {
        echo "error: refusing unowned deployment network $NETWORK" >&2
        exit 1
    }
else
    docker network create --label "$OWNER_LABEL=1" --label "$OWNER_LABEL.root=$ROOT" "$NETWORK" >/dev/null
fi

# Rollback identity is durable and signed before candidate start or health.
write_signed "$TRANSACTION" <<EOF
phase=candidate
previous_container=$old_container
previous_root=$old_root
candidate_container=$CANDIDATE
candidate_root=$RELEASE
candidate_image=$image_id
source_revision=$source_revision
EOF

set --
for provider in claude codex gemini qwen; do
    case "$provider" in
        claude) source=$claude_home; directory=.claude;;
        codex) source=$codex_home; directory=.codex;;
        gemini) source=$gemini_home; directory=.gemini;;
        qwen) source=$qwen_home; directory=.qwen;;
    esac
    if [ -d "$source" ]; then
        set -- "$@" -v "$source:/data/home/$directory"
    fi
done
# Runtime environment passthrough (issue #679): values reach Docker through a
# private file, never argv; the fingerprint label tells a reconcile apart.
if [ -n "$SETTINGS_DIR" ] && [ -s "$SETTINGS_DIR/runtime.env" ]; then
    set -- "$@" --env-file "$SETTINGS_DIR/runtime.env" \
        --label "$OWNER_LABEL.runtime-env=$ENV_FINGERPRINT"
fi
if [ -n "$INSTANCE" ]; then set -- "$@" --label "$OWNER_LABEL.instance=$INSTANCE"; fi

mark candidate

docker run -d --name "$CANDIDATE" --network "$NETWORK" --restart unless-stopped \
    --user "$SELF_UID:$SELF_GID" \
    --label "$OWNER_LABEL=1" --label "$OWNER_LABEL.root=$ROOT" \
    --label "$OWNER_LABEL.cookie=$COOKIE" \
    -p 127.0.0.1::8080 \
    -v "$RELEASE/home:/data/home" -v "$SHARED_DATA:/data/router" "$@" \
    -e TOKEN_SECRET -e DATA_DIR=/data/router -e STORAGE_POLICY=text \
    -e HOME=/data/home -e CLAUDE_CODE_HOME=/data/home/.claude \
    ${PUBLIC_PORT:+-p 127.0.0.1::8443} \
    ${PUBLIC_PORT:+-e TLS_SELF_SIGNED=1} \
    ${PUBLIC_PORT:+-e TLS_SELF_SIGNED_DNS=$PUBLIC_NAME} \
    ${PUBLIC_PORT:+-e LISTENERS=0.0.0.0:8080=combined,http;0.0.0.0:8443=inference-only,tls} \
    "$IMAGE" serve >/dev/null
if [ -n "$SETTINGS_DIR" ]; then rm -f "$SETTINGS_DIR/runtime.env"; fi

cleanup_candidate() {
    remove_owned_candidate "$CANDIDATE"
    remove_release_root "$RELEASE"
}
cutover_done=0
on_failure() {
    code=$?
    # Do not allow the explicit exit below to re-enter this handler. Signals
    # first become a non-zero exit, then arrive here through the EXIT trap.
    trap - EXIT HUP INT TERM
    if [ "$code" -ne 0 ] && [ "$cutover_done" -eq 0 ]; then
        failed_current=$(sed -n '1p' "$STATE/current" 2>/dev/null || true)
        if [ "$failed_current" = "$CANDIDATE" ] && [ -n "$old_container" ] && owned_container "$old_container"; then
            printf '%s\n' "$old_container" > "$STATE/current.rollback.$$"
            mv "$STATE/current.rollback.$$" "$STATE/current"
            while [ "$(cat "$STATE/connections/$CANDIDATE" 2>/dev/null || echo 0)" != 0 ]; do
                sleep 1
            done
            cleanup_candidate
        elif [ "$failed_current" != "$CANDIDATE" ]; then
            cleanup_candidate
        else
            echo "interrupted first cutover retained resumable candidate $CANDIDATE" >&2
        fi
    fi
    release_lease
    exit "$code"
}
trap on_failure EXIT
trap 'exit 130' HUP INT TERM

candidate_port=$(docker port "$CANDIDATE" 8080/tcp | sed -n 's/.*://p' | sed -n '1p')
[ -n "$candidate_port" ] || { echo "error: candidate has no temporary management port" >&2; exit 1; }

mark health
ready=0
attempt=0
while [ "$attempt" -lt 300 ]; do
    if docker exec "$CANDIDATE" bun -e \
        'const r=await fetch("http://127.0.0.1:8080/api/health",{signal:AbortSignal.timeout(5000)});process.exit(r.status===200?0:1)' \
        >/dev/null 2>&1; then
        ready=1
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done
[ "$ready" -eq 1 ] || { echo "error: candidate did not become healthy" >&2; exit 1; }

if ! preservation_catalogs "$CANDIDATE" > "$RELEASE/preservation-after.json"; then
    echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","reason":"candidate issued-token catalog unavailable; old backend retained"}' >&2
    exit 1
fi
PRESERVATION_BEFORE=$(cat "$RELEASE/preservation-before.json")
PRESERVATION_AFTER=$(cat "$RELEASE/preservation-after.json")
export PRESERVATION_BEFORE PRESERVATION_AFTER
if ! docker exec -e PRESERVATION_BEFORE -e PRESERVATION_AFTER "$CANDIDATE" bun -e '
const old=JSON.parse(process.env.PRESERVATION_BEFORE),candidate=JSON.parse(process.env.PRESERVATION_AFTER);
for(const row of old){const next=candidate.find(n=>n.token_id===row.token_id&&n.client_kind===row.client_kind);if(!next||row.models.some(m=>!next.models.includes(m)))process.exit(2);}
console.log(JSON.stringify({schema:"link-assistant-router/preservation/v1",status:"candidate-checked",issued_bound_tokens:old.length,credentials_copied:false,data_restore_proven:false}));'; then
    echo '{"schema":"link-assistant-router/preservation/v1","status":"refused","reason":"previously authorized token/provider models disappeared; old backend retained"}' >&2
    exit 1
fi
unset PRESERVATION_BEFORE PRESERVATION_AFTER

ADMIN=$(docker exec "$CANDIDATE" router tokens issue --admin --ttl-hours 1 \
    --label deploy-verification | grep -o 'la_sk_[A-Za-z0-9._-]*' | sed -n '1p')
[ -n "$ADMIN" ] || { echo "error: candidate could not mint a verification admin token" >&2; exit 1; }
export VERIFY_ADMIN=$ADMIN
provider_keys_step || exit 1

verify_router() {
    VERIFY_ORIGIN=$1
    VERIFY_PUBLIC_ORIGIN=$2
    VERIFY_PUBLIC_NAME=$PUBLIC_NAME
    export VERIFY_ORIGIN VERIFY_PUBLIC_ORIGIN VERIFY_PUBLIC_NAME VERIFY_CLAUDE VERIFY_CODEX VERIFY_QWEN VERIFY_GEMINI VERIFY_OPENCODE
    docker exec -i -e VERIFY_ORIGIN -e VERIFY_PUBLIC_ORIGIN -e VERIFY_ADMIN \
        -e VERIFY_PUBLIC_NAME -e VERIFY_PROFILE \
        -e VERIFY_CLAUDE -e VERIFY_CODEX -e VERIFY_QWEN -e VERIFY_GEMINI -e VERIFY_OPENCODE \
        -e NODE_EXTRA_CA_CERTS=/data/router/tls/cert.pem "$CANDIDATE" bun - <<'JAVASCRIPT'
const origin = process.env.VERIFY_ORIGIN;
const admin = process.env.VERIFY_ADMIN;
const publicOrigin = process.env.VERIFY_PUBLIC_ORIGIN;
const publicName = process.env.VERIFY_PUBLIC_NAME;
const clients = [
  {key:"CLAUDE", kind:"claude", catalog:"/api/services/anthropic/v1/models", carrier:"x-api-key", live:"/api/services/anthropic/v1/messages", body:id=>({model:id,max_tokens:64,messages:[{role:"user",content:"Reply OK"}]})},
  {key:"CODEX", kind:"codex", catalog:"/api/services/codex/v1/models", carrier:"authorization", live:"/api/services/codex/v1/responses", body:id=>({model:id,input:"Reply OK",max_output_tokens:64,reasoning:{effort:"low"}})},
  {key:"QWEN", kind:"qwen-code", catalog:"/api/services/qwen/v1/models", carrier:"authorization", live:"/api/services/qwen/v1/chat/completions", body:id=>({model:id,max_tokens:64,messages:[{role:"user",content:"Reply OK"}]})},
  {key:"GEMINI", kind:"gemini", catalog:"/api/services/gemini/v1beta/models", carrier:"x-goog-api-key", liveModel:true, body:id=>({contents:[{role:"user",parts:[{text:"Reply OK"}]}],generationConfig:{maxOutputTokens:64}})},
  {key:"OPENCODE", kind:"opencode", catalog:"/api/services/openai/v1/models", carrier:"authorization", live:"/api/services/openai/v1/chat/completions", body:id=>({model:id,max_tokens:64,messages:[{role:"user",content:"Reply OK"}]})},
];
const fail = message => { throw new Error(message); };
async function call(base, path, options={}) {
  if (base.startsWith("https://")) {
    const target = new URL(base + path);
    return await new Promise((resolve, reject) => {
      const request = require("node:https").request({
        hostname:target.hostname, port:target.port, path:target.pathname + target.search,
        method:options.method || "GET", headers:{...(options.headers || {}),host:publicName},
        servername:publicName, rejectUnauthorized:true,
        ca:require("node:fs").readFileSync("/data/router/tls/cert.pem")
      }, response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () => resolve({status:response.statusCode, text:Buffer.concat(chunks).toString()}));
      });
      request.setTimeout(15000, () => request.destroy(new Error("verification HTTP deadline exceeded")));
      request.on("error", reject);
      if (options.body) request.write(options.body);
      request.end();
    });
  }
  const response = await fetch(base + path, {...options,signal:AbortSignal.timeout(15000)});
  const text = await response.text();
  return {status:response.status, text};
}
function logSnapshot() {
  const root = "/data/router/requests";
  const sizes = new Map();
  try {
    for (const entry of require("node:fs").readdirSync(root, {recursive:true})) {
      const path = `${root}/${entry}`;
      try { if (require("node:fs").statSync(path).isFile()) sizes.set(path, require("node:fs").statSync(path).size); } catch {}
    }
  } catch {}
  return sizes;
}
function upstreamReached(before) {
  const after = logSnapshot();
  for (const [path, size] of after) {
    const offset = before.get(path) || 0;
    if (size <= offset) continue;
    const descriptor = require("node:fs").openSync(path, "r");
    try {
      const bytes = Buffer.alloc(size - offset);
      require("node:fs").readSync(descriptor, bytes, 0, bytes.length, offset);
      if (bytes.toString().includes('"phase":"upstream_request"')) return true;
    } finally { require("node:fs").closeSync(descriptor); }
  }
  return false;
}
function auth(client, token) {
  const headers = {"content-type":"application/json", "x-link-assistant-client-check":"reachability"};
  headers[client.carrier] = client.carrier === "authorization" ? `Bearer ${token}` : token;
  if (client.kind === "claude") headers["anthropic-version"] = "2023-06-01";
  return headers;
}
async function token(client) {
  const existing = process.env[`VERIFY_${client.key}`];
  if (existing) return existing;
  const issued = await call(origin, "/api/management/tokens/client", {
    method:"POST", headers:{authorization:`Bearer ${admin}`,"content-type":"application/json"},
    body:JSON.stringify({client_kind:client.kind,label:`deploy-verify-${client.kind}`,ttl_hours:1,ephemeral:true})
  });
  if (issued.status !== 200) fail(`could not mint ${client.kind} token: ${issued.status}`);
  return JSON.parse(issued.text).token;
}
const health = await call(origin, "/api/health");
if (health.status !== 200) fail(`health returned ${health.status}`);
const legacy = await call(origin, "/v1/models", {headers:{authorization:`Bearer ${admin}`}});
if (legacy.status !== 404) fail(`removed legacy /v1/models returned ${legacy.status}, not 404`);
for (const client of clients) {
  client.token = await token(client);
  const denied = await call(origin, "/api/management/tokens", {headers:auth(client, client.token)});
  if (denied.status !== 401) fail(`${client.kind} token reached management with ${denied.status}, not 401`);
  const catalog = await call(origin, client.catalog, {headers:auth(client, client.token)});
  if (catalog.status !== 200) fail(`${client.kind} catalog returned ${catalog.status}`);
  const parsed = JSON.parse(catalog.text);
  client.degraded = parsed.degraded_providers || [];
  client.models = (parsed.data || parsed.models || []).map(item => {
    if (typeof item === "string") return {id:item, owner:"", service:""};
    const raw = item.id || item.slug || item.name || "";
    return {id:raw.replace(/^models\//, ""), owner:item.owned_by || "", service:item.service || ""};
  }).filter(model => model.id);
  console.log(`VERIFY_${client.key}=${client.token}`);
}

// An invented model is absent for everybody and correctly produces 404. To
// verify provider scoping, use a real configured model that this client's
// authorized catalog excludes. With no such model there is no outside set to
// test (including the explicitly supported no-provider deployment).
for (const client of clients) {
  const own = new Set(client.models.map(model => model.id));
  const outside = clients.flatMap(candidate => candidate.models).find(model => !own.has(model.id));
  if (!outside) continue;
  const outsidePath = client.liveModel
    ? `/api/services/gemini/v1beta/models/${encodeURIComponent(outside.id)}:generateContent`
    : client.live;
  const denied = await call(origin, outsidePath, {
    method:"POST", headers:auth(client,client.token), body:JSON.stringify(client.body(outside.id))
  });
  if (denied.status !== 403)
    fail(`${client.kind} token's outside model returned ${denied.status}, not 403`);
}

// A missing credential is a legitimate withdrawal. Health names only the
// subscriptions actually configured on this target, while the provider API
// names ordinary configured API providers. An empty advertised model set is
// also legitimate; every other configured provider is exercised exactly once.
const subscriptionHealth = await call(origin, "/api/management/health/subscriptions", {headers:{authorization:`Bearer ${admin}`}});
let healthBody;
try { healthBody = JSON.parse(subscriptionHealth.text); } catch { fail("subscription health was not JSON"); }
if (subscriptionHealth.status !== 200)
  fail(`configured subscription health returned ${subscriptionHealth.status}: ${healthBody.status || "degraded"}`);
const nativeClients = {claude:"claude", codex:"codex", gemini:"gemini", qwen:"qwen"};
const configuredSubscriptions = [...(healthBody.healthy_providers || []), ...(healthBody.starting_providers || [])]
  .filter(provider => nativeClients[provider]);
const plans = [];
for (const provider of configuredSubscriptions) {
  const client = clients.find(candidate => candidate.kind === nativeClients[provider]);
  if (client.models.length) plans.push({provider, client, model:client.models[0].id});
}

const providerAnswer = await call(origin, "/api/management/providers", {headers:{authorization:`Bearer ${admin}`}});
if (providerAnswer.status !== 200) fail(`configured provider list returned ${providerAnswer.status}`);
const configuredProviders = (JSON.parse(providerAnswer.text).data || []).filter(provider => provider.enabled);
for (const provider of configuredProviders) {
  const owner = provider.kind === "z.ai-coding-plan" ? "z.ai" : provider.name;
  const compatible = clients.filter(client => (provider.supported_clients || []).includes(client.kind));
  if (compatible.some(client => client.degraded.includes(owner) || client.degraded.includes(provider.name)))
    fail(`configured provider ${provider.name} has a degraded live catalog`);
  let selected;
  for (const client of compatible) {
    const model = client.models.find(model => model.owner === owner || model.owner === provider.name);
    if (model) { selected = {provider:provider.name, client, model:model.id}; break; }
  }
  if (selected) plans.push(selected);
}

const exercised = new Set();
for (const plan of plans) {
  if (exercised.has(plan.provider)) continue;
  exercised.add(plan.provider);
  const before = logSnapshot();
  const path = plan.client.liveModel ? `/api/services/gemini/v1beta/models/${encodeURIComponent(plan.model)}:generateContent` : plan.client.live;
  const live = await call(origin, path, {method:"POST",headers:auth(plan.client,plan.client.token),body:JSON.stringify(plan.client.body(plan.model))});
  if (!(live.status >= 200 && live.status < 300) && !upstreamReached(before))
    fail(`${plan.provider} live inference failed before leaving Router: ${live.status}`);
}
if (publicOrigin) {
  const publicHealth = await call(publicOrigin, "/api/health");
  if (publicHealth.status !== 200) fail(`public TLS health returned ${publicHealth.status}`);
  const publicManagement = await call(publicOrigin, "/api/management/tokens", {headers:{authorization:`Bearer ${admin}`}});
  if (publicManagement.status !== 404) fail(`public inference listener exposed management: ${publicManagement.status}`);
  const sample = clients.find(client => client.models.length);
  if (sample) {
    const catalog = await call(publicOrigin, sample.catalog, {headers:auth(sample,sample.token)});
    if (catalog.status !== 200) fail(`public TLS catalog returned ${catalog.status}`);
    const before = logSnapshot();
    const model = sample.models[0].id;
    const path = sample.liveModel
      ? `/api/services/gemini/v1beta/models/${encodeURIComponent(model)}:generateContent`
      : sample.live;
    const live = await call(publicOrigin, path, {
      method:"POST", headers:auth(sample,sample.token), body:JSON.stringify(sample.body(model))
    });
    if (!(live.status >= 200 && live.status < 300) && !upstreamReached(before))
      fail(`public TLS inference failed before leaving Router: ${live.status}`);
  }
}
@@VERIFY_PROFILE@@
JAVASCRIPT
}

VERIFY_CLAUDE= VERIFY_CODEX= VERIFY_QWEN= VERIFY_GEMINI= VERIFY_OPENCODE=
export VERIFY_CLAUDE VERIFY_CODEX VERIFY_QWEN VERIFY_GEMINI VERIFY_OPENCODE
public_candidate=
if [ -n "$PUBLIC_PORT" ]; then public_candidate=https://127.0.0.1:8443; fi
mark verification
verified=1
if [ -n "$PROFILE" ]; then
    VERIFY_PROFILE=$(cat "$PROFILE")
    export VERIFY_PROFILE
fi
verification=$(verify_router "http://127.0.0.1:8080" "$public_candidate") || verified=0
unset VERIFY_PROFILE
report_profile "$verification"
[ "$verified" = 1 ] || {
    echo "error: candidate verification failed" >&2
    exit 1
}
while IFS='=' read -r name value; do
    case "$name" in
        VERIFY_CLAUDE) VERIFY_CLAUDE=$value ;;
        VERIFY_CODEX) VERIFY_CODEX=$value ;;
        VERIFY_QWEN) VERIFY_QWEN=$value ;;
        VERIFY_GEMINI) VERIFY_GEMINI=$value ;;
        VERIFY_OPENCODE) VERIFY_OPENCODE=$value ;;
    esac
done <<EOF
$verification
EOF
export VERIFY_CLAUDE VERIFY_CODEX VERIFY_QWEN VERIFY_GEMINI VERIFY_OPENCODE
echo "candidate verified on temporary port $candidate_port"

if docker inspect "$RELAY" >/dev/null 2>&1; then
    owned_container "$RELAY" || { echo "error: refusing unowned relay container $RELAY" >&2; exit 1; }
    [ "$(docker_label "$OWNER_LABEL.management-port" "$RELAY")" = "$MANAGEMENT_PORT" ] || {
        echo "error: existing relay publishes a different management port; use --down --yes first" >&2
        exit 1
    }
    [ "$(docker_label "$OWNER_LABEL.public-port" "$RELAY")" = "$PUBLIC_PORT" ] || {
        echo "error: existing relay publishes a different public port; use --down --yes first" >&2
        exit 1
    }
else
    printf '%s\n' "$old_container" > "$STATE/current.initial.$$"
    if [ -z "$old_container" ]; then printf '%s\n' "$CANDIDATE" > "$STATE/current.initial.$$"; fi
    mv "$STATE/current.initial.$$" "$STATE/current"
    relay_listeners=0.0.0.0:8080,8080
    if [ -n "$PUBLIC_PORT" ]; then relay_listeners="$relay_listeners;0.0.0.0:8443,8443"; fi
    docker run -d --name "$RELAY" --network "$NETWORK" --restart unless-stopped \
        --user "$SELF_UID:$SELF_GID" \
        --label "$OWNER_LABEL=1" --label "$OWNER_LABEL.root=$ROOT" \
        --label "$OWNER_LABEL.management-port=$MANAGEMENT_PORT" \
        --label "$OWNER_LABEL.public-port=$PUBLIC_PORT" \
        -p "127.0.0.1:$MANAGEMENT_PORT:8080" \
        ${PUBLIC_PORT:+-p 0.0.0.0:$PUBLIC_PORT:8443} \
        -v "$STATE:/deploy-state" -e ROUTER_DEPLOY_RELAY_STATE=/deploy-state/current \
        -e "ROUTER_DEPLOY_RELAY_LISTENERS=$relay_listeners" "$IMAGE" serve >/dev/null
fi

mark cutover
relay_ready=0
attempt=0
while [ "$attempt" -lt 60 ]; do
    if docker exec "$CANDIDATE" bun -e \
        "const r=await fetch('http://$RELAY:8080/api/health');process.exit(r.status===200?0:1)" \
        >/dev/null 2>&1; then
        relay_ready=1
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done
[ "$relay_ready" -eq 1 ] || { echo "error: deployment relay did not become healthy" >&2; exit 1; }

# Atomic rename is the cutover. Connections accepted before it remain counted
# against the old backend and are allowed to finish.
printf '%s\n' "$CANDIDATE" > "$STATE/current.next.$$"
mv "$STATE/current.next.$$" "$STATE/current"
write_signed "$TRANSACTION" <<EOF
phase=post-verify
previous_container=$old_container
previous_root=$old_root
candidate_container=$CANDIDATE
candidate_root=$RELEASE
candidate_image=$image_id
source_revision=$source_revision
EOF

mark post-verify
live_public=
if [ -n "$PUBLIC_PORT" ]; then live_public=https://$RELAY:8443; fi
if ! verify_router "http://$RELAY:8080" "$live_public" >/dev/null; then
    if [ -n "$old_container" ]; then
        printf '%s\n' "$old_container" > "$STATE/current.rollback.$$"
        mv "$STATE/current.rollback.$$" "$STATE/current"
        while [ "$(cat "$STATE/connections/$CANDIDATE" 2>/dev/null || echo 0)" != 0 ]; do
            sleep 1
        done
        echo "post-cutover verification failed; restored $old_container" >&2
    else
        if owned_container "$RELAY"; then docker rm -f "$RELAY" >/dev/null 2>&1 || true; fi
        rm -f "$STATE/current"
        cleanup_candidate
    fi
    exit 1
fi
cutover_done=1

# From this point the candidate has passed verification through the live relay.
# Record that fact before retiring the only possible rollback backend, so a
# subsequent process can finish this drain/removal rather than destroying the
# accepted candidate when no predecessor remains.
write_signed "$TRANSACTION" <<EOF
phase=accepted
previous_container=$old_container
previous_root=$old_root
candidate_container=$CANDIDATE
candidate_root=$RELEASE
candidate_image=$image_id
source_revision=$source_revision
management_port=$MANAGEMENT_PORT
public_port=$PUBLIC_PORT
EOF

mark retire
if [ -n "$old_container" ] && [ "$old_container" != "$CANDIDATE" ]; then
    while [ "$(cat "$STATE/connections/$old_container" 2>/dev/null || echo 0)" != 0 ]; do
        sleep 1
    done
    remove_owned_candidate "$old_container"
    if [ -n "$old_root" ]; then remove_release_root "$old_root"; fi
fi

write_signed "$STATE/active" <<EOF
container=$CANDIDATE
release_root=$RELEASE
image=$image_id
source_revision=$source_revision
management_port=$MANAGEMENT_PORT
public_port=$PUBLIC_PORT
EOF
write_signed "$TRANSACTION" <<EOF
phase=complete
previous_container=$old_container
previous_root=$old_root
candidate_container=$CANDIDATE
candidate_root=$RELEASE
candidate_image=$image_id
source_revision=$source_revision
management_port=$MANAGEMENT_PORT
public_port=$PUBLIC_PORT
EOF
trap release_lease EXIT
trap 'exit 130' HUP INT TERM
deploy_token_step
mark complete
echo "deployment is ready on $PUBLIC_NAME (management: 127.0.0.1:$MANAGEMENT_PORT${PUBLIC_PORT:+, public TLS: $PUBLIC_PORT})"
