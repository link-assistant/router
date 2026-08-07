#!/usr/bin/env bash
# Verifies the deployment claims made by docs/use-cases/self-hosting.md.
#
# Issue #45 states the general purpose of the router: "usage as an internal
# component of personal or corporate infrastructure". That makes the exposure
# of the admin surface a use case in its own right, so the claims in the
# self-hosting document are asserted here rather than assumed:
#
#   * with TOKEN_ADMIN_KEY unset, /api/tokens refuses anonymous callers and the
#     router prints a one-off bootstrap admin token instead (issue #49),
#   * with TOKEN_ADMIN_KEY set, issuing/listing/revoking require the key,
#   * an admin key is NOT a proxy credential and a task token is NOT an admin
#     credential — the two surfaces do not accept each other's secrets,
#   * ROUTER_HOST controls the bind address, and the default is 0.0.0.0,
#   * the router starts and serves with no subscription present at all.
#
# No subscription and no network egress are required: every assertion is about
# the router's own admin/auth surface, so requests never reach an upstream.
#
# Usage: experiments/issue-45/test-deployment-hardening.sh
set -euo pipefail

IMAGE="${IMAGE:-la-router:issue-45}"
OPEN_PORT="${OPEN_PORT:-8893}"
KEYED_PORT="${KEYED_PORT:-8894}"
LOOPBACK_PORT="${LOOPBACK_PORT:-8895}"
ADMIN_KEY="issue-45-admin-key"
PASS=0
FAIL=0
CONTAINERS=()

cleanup() {
  for name in "${CONTAINERS[@]:-}"; do
    [[ -n "$name" ]] && docker rm -f "$name" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

check() {
  if [[ "$2" == "ok" ]]; then
    echo "PASS  $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $1 ($2)"
    FAIL=$((FAIL + 1))
  fi
}

expect_status() { # expect_status <name> <expected> <actual>
  if [[ "$3" == "$2" ]]; then check "$1" ok; else check "$1" "want $2, got $3"; fi
}

start() { # start <name> <port> [extra env...]
  local name="$1" port="$2"
  shift 2
  CONTAINERS+=("$name")
  docker run -d --rm --name "$name" \
    -p "127.0.0.1:$port:8080" \
    -e TOKEN_SECRET=docker-test-secret-not-a-real-key \
    -e DATA_DIR=/data/router \
    "$@" "$IMAGE" serve >/dev/null
  for _ in $(seq 1 60); do
    curl -sf "http://127.0.0.1:$port/health" >/dev/null && return 0
    sleep 0.5
  done
  return 1
}

docker image inspect "$IMAGE" >/dev/null 2>&1 ||
  { echo "SKIP: image $IMAGE not built (docker build -t $IMAGE .)"; exit 2; }

# --- No subscription mounted: the router must still start and serve ---------
start la-router-open "$OPEN_PORT" && check "starts with no subscription mounted" ok ||
  check "starts with no subscription mounted" "never became healthy"

# --- TOKEN_ADMIN_KEY unset: the admin surface is CLOSED (issue #49) --------
OPEN_ISSUE=$(curl -s -o /tmp/issue45-open.json -w '%{http_code}' \
  -X POST "http://127.0.0.1:$OPEN_PORT/api/tokens" \
  -H 'Content-Type: application/json' -d '{"ttl_hours":1,"label":"unauthenticated"}')
expect_status "without an admin credential nobody can mint a token" 401 "$OPEN_ISSUE"
OPEN_TOKEN=$(python3 -c 'import json;print(json.load(open("/tmp/issue45-open.json")).get("token",""))')
[[ -z "$OPEN_TOKEN" ]] && check "the rejected mint returns no token" ok ||
  check "the rejected mint returns no token" "got $OPEN_TOKEN"

OPEN_LIST=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$OPEN_PORT/api/tokens/list")
expect_status "without an admin credential the token list is not readable" 401 "$OPEN_LIST"

# The router mints a bootstrap admin token instead and prints it once.
BOOTSTRAP=$(docker logs la-router-open 2>&1 | sed -n 's/.*Admin token (shown once, store it now): //p' | tail -1)
[[ "$BOOTSTRAP" == la_sk_* ]] && check "a bootstrap admin token is printed at startup" ok ||
  check "a bootstrap admin token is printed at startup" "no token in the logs"

BOOTSTRAP_LIST=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $BOOTSTRAP" "http://127.0.0.1:$OPEN_PORT/api/tokens/list")
expect_status "the bootstrap admin token opens the admin surface" 200 "$BOOTSTRAP_LIST"

# --- TOKEN_ADMIN_KEY set: every admin route requires it --------------------
start la-router-keyed "$KEYED_PORT" -e "TOKEN_ADMIN_KEY=$ADMIN_KEY" ||
  check "keyed container becomes healthy" "never became healthy"

NO_KEY=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "http://127.0.0.1:$KEYED_PORT/api/tokens" \
  -H 'Content-Type: application/json' -d '{"ttl_hours":1,"label":"no-key"}')
expect_status "issuing without the admin key is rejected" 401 "$NO_KEY"

BAD_KEY=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "http://127.0.0.1:$KEYED_PORT/api/tokens" \
  -H "Authorization: Bearer wrong-key" \
  -H 'Content-Type: application/json' -d '{"ttl_hours":1,"label":"bad-key"}')
expect_status "issuing with a wrong admin key is rejected" 401 "$BAD_KEY"

LIST_NO_KEY=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$KEYED_PORT/api/tokens/list")
expect_status "listing without the admin key is rejected" 401 "$LIST_NO_KEY"

REVOKE_NO_KEY=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "http://127.0.0.1:$KEYED_PORT/api/tokens/revoke" \
  -H 'Content-Type: application/json' -d '{"id":"whatever"}')
expect_status "revoking without the admin key is rejected" 401 "$REVOKE_NO_KEY"

GOOD=$(curl -s -o /tmp/issue45-keyed.json -w '%{http_code}' \
  -X POST "http://127.0.0.1:$KEYED_PORT/api/tokens" \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H 'Content-Type: application/json' -d '{"ttl_hours":1,"label":"keyed"}')
expect_status "issuing with the admin key succeeds" 200 "$GOOD"
TASK_TOKEN=$(python3 -c 'import json;print(json.load(open("/tmp/issue45-keyed.json")).get("token",""))')
[[ "$TASK_TOKEN" == la_sk_* ]] && check "the keyed mint returns a task token" ok ||
  check "the keyed mint returns a task token" "no la_sk_ token"

# A rejected revoke must be a no-op, not merely an error response: an outsider
# must not be able to deny service by cancelling someone else's task token.
TOKEN_ID=$(curl -s "http://127.0.0.1:$KEYED_PORT/api/tokens/list" \
  -H "Authorization: Bearer $ADMIN_KEY" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["data"][-1]["id"])')
curl -s -o /dev/null -X POST "http://127.0.0.1:$KEYED_PORT/api/tokens/revoke" \
  -H 'Content-Type: application/json' -d "{\"id\":\"$TOKEN_ID\"}"
STILL_LIVE=$(curl -s "http://127.0.0.1:$KEYED_PORT/api/tokens/list" \
  -H "Authorization: Bearer $ADMIN_KEY" |
  python3 -c "import json,sys; print(next(x['revoked'] for x in json.load(sys.stdin)['data'] if x['id']=='$TOKEN_ID'))")
[[ "$STILL_LIVE" == "False" ]] &&
  check "an unauthenticated revoke does not actually revoke" ok ||
  check "an unauthenticated revoke does not actually revoke" "revoked=$STILL_LIVE"

# --- The two secrets are not interchangeable -------------------------------
# A task token must not unlock the admin surface...
TASK_AS_ADMIN=$(curl -s -o /dev/null -w '%{http_code}' \
  "http://127.0.0.1:$KEYED_PORT/api/tokens/list" \
  -H "Authorization: Bearer $TASK_TOKEN")
expect_status "a task token cannot read the admin surface" 401 "$TASK_AS_ADMIN"

# ...and the admin key must not be accepted as a proxy credential. The request
# is rejected at authentication, so it never reaches an upstream.
ADMIN_AS_TASK=$(curl -s -o /dev/null -w '%{http_code}' \
  "http://127.0.0.1:$KEYED_PORT/v1/messages" \
  -H "Authorization: Bearer $ADMIN_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":8,
       "messages":[{"role":"user","content":"ping"}]}')
expect_status "the admin key is not accepted as a proxy credential" 401 "$ADMIN_AS_TASK"

# --- ROUTER_HOST controls the bind address ---------------------------------
# Binding to the container's own loopback deliberately makes the published port
# unreachable, so this container is never waited on for /health; the startup log
# is the assertion.
CONTAINERS+=(la-router-loopback)
docker run -d --rm --name la-router-loopback \
  -p "127.0.0.1:$LOOPBACK_PORT:8080" \
  -e TOKEN_SECRET=docker-test-secret-not-a-real-key \
  -e DATA_DIR=/data/router \
  -e ROUTER_HOST=127.0.0.1 \
  "$IMAGE" serve >/dev/null
for _ in $(seq 1 20); do
  docker logs la-router-loopback 2>&1 | grep -q ':8080' && break
  sleep 0.5
done
UNREACHABLE=$(curl -s -o /dev/null -m 5 -w '%{http_code}' \
  "http://127.0.0.1:$LOOPBACK_PORT/health" 2>/dev/null || echo 000)
[[ "$UNREACHABLE" != "200" ]] &&
  check "a loopback-bound router is not reachable through the published port" ok ||
  check "a loopback-bound router is not reachable through the published port" "got 200"
BIND_LOG=$(docker logs la-router-loopback 2>&1 || true)
if [[ "$BIND_LOG" == *"127.0.0.1:8080"* ]]; then
  check "ROUTER_HOST is honoured (bound to 127.0.0.1)" ok
else
  check "ROUTER_HOST is honoured (bound to 127.0.0.1)" "no 127.0.0.1:8080 in startup log"
fi
DEFAULT_LOG=$(docker logs la-router-open 2>&1 || true)
if [[ "$DEFAULT_LOG" == *"0.0.0.0:8080"* ]]; then
  check "the default bind address is 0.0.0.0" ok
else
  check "the default bind address is 0.0.0.0" "no 0.0.0.0:8080 in startup log"
fi

echo
echo "passed: $PASS  failed: $FAIL"
[[ "$FAIL" -eq 0 ]]
