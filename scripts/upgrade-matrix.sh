#!/usr/bin/env bash
# Upgrade compatibility matrix (issue #673).
#
# A released Router writes a data directory (tokens, a revoked token, an admin
# token, a provider with an encrypted API key, a persisted server profile);
# the Router under test must read and keep serving it unchanged.
#
#   upgrade-matrix.sh download TAG DIR      fetch and checksum-verify a release, print its router path
#   upgrade-matrix.sh seed OLD_ROUTER STATE write the state with a released router
#   upgrade-matrix.sh verify NEW_ROUTER STATE
#                                           read, serve and extend it with the router under test
#   upgrade-matrix.sh fixture OLD_ROUTER DIR
#                                           seed, then keep only the durable files, for
#                                           tests/fixtures/upgrade/<version>/
#
# STATE holds data/ (the data directory), home/ (HOME, for the server
# profile) and tokens.env (the issued bearer tokens and their ids). Every
# secret here is a throwaway: the signing secret below and a fake API key.
set -euo pipefail

TOKEN_SECRET="${UPGRADE_TOKEN_SECRET:-upgrade-matrix-secret-0123456789abcdef}"
export TOKEN_SECRET
PROVIDER_NAME="upgrade-stub"
PROVIDER_KEY="upgrade-matrix-fake-api-key"
SERVER_URL="http://127.0.0.1:18080"
TTL_HOURS="${UPGRADE_TTL_HOURS:-720}"

die() {
  echo "upgrade-matrix: $*" >&2
  exit 1
}

usage() {
  sed -n '2,19p' "$0" >&2
  exit 2
}

# Run a router against STATE, isolated from the caller's own configuration.
run() {
  local router="$1" state="$2"
  shift 2
  HOME="$state/home" XDG_CONFIG_HOME="$state/home/.config" \
    "$router" --data-dir "$state/data" "$@"
}

download() {
  local tag="$1" dir="$2" stem asset sums
  stem="link-assistant-router-${tag#v}-linux-amd64"
  asset="$stem.tar.gz"
  sums="$stem.sha256"
  mkdir -p "$dir"
  gh release download "$tag" --repo "${UPGRADE_REPO:-link-assistant/router}" \
    --pattern "$asset" --pattern "$sums" --dir "$dir" --clobber >&2
  # The checksum file also lists the SBOM, which is not downloaded.
  grep -q " \*\?$asset\$" "$dir/$sums" || die "$sums does not list $asset"
  (cd "$dir" && sha256sum --check --strict --ignore-missing "$sums" >&2) ||
    die "checksum mismatch for $asset"
  tar -xzf "$dir/$asset" -C "$dir"
  [ -x "$dir/router" ] || die "$asset has no ./router"
  echo "$dir/router"
}

# The last line a `tokens issue` prints is the bearer token.
issue() {
  local router="$1" state="$2"
  shift 2
  run "$router" "$state" tokens issue --local --ttl-hours "$TTL_HOURS" "$@" | tail -n 1
}

# The id column of the `tokens list` row with LABEL.
token_id() {
  local router="$1" state="$2" label="$3"
  run "$router" "$state" tokens list --local | awk -v label="$label" '$NF == label { print $1 }'
}

seed() {
  local old="$1" state="$2" user admin revoked
  mkdir -p "$state/data" "$state/home"
  "$old" --version >&2
  user="$(issue "$old" "$state" --label upgrade-user --max-requests 50 --max-tokens 100000)"
  admin="$(issue "$old" "$state" --label upgrade-admin --admin)"
  revoked="$(issue "$old" "$state" --label upgrade-revoked)"
  run "$old" "$state" tokens revoke --local "$(token_id "$old" "$state" upgrade-revoked)" >&2
  printf '%s\n' "$PROVIDER_KEY" | run "$old" "$state" providers add --local \
    --name "$PROVIDER_NAME" --kind openai-compatible --base-url http://127.0.0.1:9/v1 \
    --model stub-model --api-key-stdin >&2
  run "$old" "$state" server use "$SERVER_URL" >&2
  {
    echo "USER_TOKEN=$user"
    echo "ADMIN_TOKEN=$admin"
    echo "REVOKED_TOKEN=$revoked"
    echo "USER_ID=$(token_id "$old" "$state" upgrade-user)"
    echo "ADMIN_ID=$(token_id "$old" "$state" upgrade-admin)"
    echo "REVOKED_ID=$(token_id "$old" "$state" upgrade-revoked)"
  } >"$state/tokens.env"
  for name in USER_TOKEN ADMIN_TOKEN REVOKED_TOKEN USER_ID ADMIN_ID REVOKED_ID; do
    grep -q "^$name=..*" "$state/tokens.env" || die "seed did not produce $name"
  done
  "$old" --version >"$state/VERSION"
  echo "seeded $state with $(cat "$state/VERSION")" >&2
}

fixture() {
  local old="$1" dir="$2" work
  work="$(mktemp -d)"
  TTL_HOURS="${UPGRADE_TTL_HOURS:-87600}" seed "$old" "$work"
  mkdir -p "$dir/data" "$dir/home/.config/link-assistant-router"
  cp "$work/data/tokens.lino" "$work/data/providers.lenv" "$dir/data/"
  cp "$work/home/.config/link-assistant-router/server.json" \
    "$dir/home/.config/link-assistant-router/"
  cp "$work/tokens.env" "$dir/"
  "$old" --version >"$dir/VERSION"
  rm -rf "$work"
  echo "wrote $dir" >&2
}

expect_row() {
  local listing="$1" id="$2" pattern="$3" what="$4"
  grep -E "^$id[[:space:]].*$pattern" <<<"$listing" >/dev/null ||
    die "$what: no row for $id matching /$pattern/ in:"$'\n'"$listing"
}

status_of() {
  curl -s -o /dev/null -w '%{http_code}' "$@"
}

# POST a minimal Anthropic turn; print the body and the status.
infer() {
  curl -s -X POST -H "authorization: Bearer $2" -H 'content-type: application/json' \
    -d '{"model":"stub-model","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' \
    -w ' %{http_code}' "$1/api/services/anthropic/v1/messages"
}

free_port() {
  python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])'
}

verify() {
  local new="$1" state="$2" listing shown status port pid code
  [ -f "$state/tokens.env" ] || die "$state has no tokens.env; run seed first"
  # shellcheck disable=SC1091
  . "$state/tokens.env"
  "$new" --version >&2

  # 1. Tokens: ids, caps, scope and revocation survive.
  listing="$(run "$new" "$state" tokens list --local)"
  expect_row "$listing" "$USER_ID" 'false[[:space:]]+[0-9]+/50[[:space:]]+[0-9]+/100000' "capped user token"
  expect_row "$listing" "$ADMIN_ID" 'false.*admin' "admin token"
  expect_row "$listing" "$REVOKED_ID" 'true' "revoked token"
  echo "ok: tokens list" >&2

  # 2. The provider and its encrypted key survive.
  shown="$(run "$new" "$state" providers show --local "$PROVIDER_NAME")"
  grep -Eq '"has_encrypted_api_key": *true' <<<"$shown" ||
    die "provider lost its encrypted key: $shown"
  grep -q 'http://127.0.0.1:9/v1' <<<"$shown" || die "provider lost its base URL: $shown"
  echo "ok: providers show" >&2

  # 3. The persisted server profile survives.
  status="$(HOME="$state/home" XDG_CONFIG_HOME="$state/home/.config" "$new" server status 2>&1)"
  grep -q "$SERVER_URL" <<<"$status" || die "server profile lost: $status"
  echo "ok: server status" >&2

  # 4. A serving Router honours the old tokens: the admin token reads the
  #    management API, the revoked one is refused everywhere.
  port="$(free_port)"
  HOME="$state/home" XDG_CONFIG_HOME="$state/home/.config" UPSTREAM_PROVIDER=anthropic \
    "$new" --data-dir "$state/data" --host 127.0.0.1 --port "$port" serve \
    >"$state/serve.log" 2>&1 &
  pid=$!
  # shellcheck disable=SC2064
  trap "kill $pid 2>/dev/null || true" EXIT
  for _ in $(seq 1 100); do
    curl -sf "http://127.0.0.1:$port/api/health" >/dev/null && break
    kill -0 "$pid" 2>/dev/null || { cat "$state/serve.log" >&2; die "serve exited"; }
    python3 -c 'import time; time.sleep(0.2)'
  done
  local base="http://127.0.0.1:$port"
  code="$(status_of -H "authorization: Bearer $ADMIN_TOKEN" "$base/api/management/tokens")"
  [ "$code" = 200 ] || die "old admin token: management API answered $code"
  curl -sf -H "authorization: Bearer $ADMIN_TOKEN" "$base/api/management/tokens" |
    grep -q "$USER_ID" || die "management API does not list the old user token"
  code="$(status_of -H "authorization: Bearer $REVOKED_TOKEN" "$base/api/management/tokens")"
  [ "$code" = 401 ] || [ "$code" = 403 ] || die "revoked token: management API answered $code"
  local body
  body="$(infer "$base" "$REVOKED_TOKEN")"
  grep -qi 'revoked' <<<"$body" || die "revoked token: inference answered $body"
  # The old client token still authenticates: whatever refuses it (it has no
  # managed-client binding, and there is no upstream) is not the token check.
  body="$(infer "$base" "$USER_TOKEN")"
  if grep -Eqi 'revoked|invalid token|expired|signature' <<<"$body"; then
    die "old user token no longer authenticates: $body"
  fi
  code="$(status_of -H "authorization: Bearer $USER_TOKEN" "$base/api/management/tokens")"
  [ "$code" = 401 ] || [ "$code" = 403 ] || die "user token reached the management API ($code)"
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  trap - EXIT
  echo "ok: serve honours the old tokens" >&2

  # 5. The upgraded store stays writable and keeps the old records.
  issue "$new" "$state" --label upgrade-after >/dev/null
  run "$new" "$state" tokens revoke --local "$USER_ID" >&2
  listing="$(run "$new" "$state" tokens list --local)"
  expect_row "$listing" "$USER_ID" 'true' "user token revoked after the upgrade"
  expect_row "$listing" "$ADMIN_ID" 'false.*admin' "admin token after a write"
  [ -n "$(token_id "$new" "$state" upgrade-after)" ] || die "new token missing"
  echo "ok: the upgraded store is writable" >&2
  echo "upgrade from $(cat "$state/VERSION" 2>/dev/null || echo 'the seeded release') verified" >&2
}

[ $# -ge 1 ] || usage
command="$1"
shift
# Paths become absolute: Router refuses a relative HOME.
if [ $# -eq 2 ]; then
  mkdir -p "$2"
  set -- "$1" "$(cd "$2" && pwd)"
fi
case "$command" in
  download) [ $# -eq 2 ] || usage; download "$@" ;;
  seed) [ $# -eq 2 ] || usage; seed "$@" ;;
  verify) [ $# -eq 2 ] || usage; verify "$@" ;;
  fixture) [ $# -eq 2 ] || usage; fixture "$@" ;;
  *) usage ;;
esac
