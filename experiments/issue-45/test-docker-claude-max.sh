#!/usr/bin/env bash
# Live test of the Claude MAX use cases inside a Docker container.
#
# Issue #45 asks that every documented use case be tested locally "using a copy
# of an available subscription [...] and test copy of these folders in a docker
# container". This script does exactly that:
#
#   * copies ~/.claude/.credentials.json into a throwaway directory (the
#     original is never opened for writing and never mounted),
#   * mounts that copy READ-ONLY into the container at /data/claude,
#   * issues a per-task router token and drives the two documented surfaces
#     against the live Anthropic upstream:
#       - POST /v1/messages   -> docs/use-cases/cli-claude-code.md
#       - POST /v1/responses  -> docs/use-cases/claude-max-in-codex.md
#
# Evidence is written REDACTED (no token, no credential) so it can be committed.
#
# Usage: experiments/issue-45/test-docker-claude-max.sh [output-dir]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/docs/case-studies/issue-45/evidence}"
IMAGE="${IMAGE:-la-router:issue-45}"
PORT="${PORT:-8892}"
NAME="la-router-issue45"
WORK="$(mktemp -d)"
PASS=0
FAIL=0

cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$WORK"
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

contains() { # contains <name> <haystack> <needle>
  if [[ "$2" == *"$3"* ]]; then check "$1" ok; else check "$1" "missing: $3"; fi
}

# Strip anything secret-shaped from evidence before it is written to the repo.
redact() {
  sed -E \
    -e 's/(la_sk_)[A-Za-z0-9._-]+/\1REDACTED/g' \
    -e 's/(sk-ant-[A-Za-z0-9._-]*)/sk-ant-REDACTED/g' \
    -e 's/("(access|refresh)Token"[[:space:]]*:[[:space:]]*")[^"]*/\1REDACTED/g'
}

if [[ ! -f "$HOME/.claude/.credentials.json" ]]; then
  echo "SKIP: no ~/.claude/.credentials.json — a Claude MAX session is required."
  exit 2
fi
docker image inspect "$IMAGE" >/dev/null 2>&1 ||
  { echo "SKIP: image $IMAGE not built (docker build -t $IMAGE .)"; exit 2; }

mkdir -p "$OUT" "$WORK/claude" "$WORK/router"
# Copy only the credential file: the rest of ~/.claude is history and projects
# that the router never reads.
cp "$HOME/.claude/.credentials.json" "$WORK/claude/.credentials.json"
chmod 600 "$WORK/claude/.credentials.json"

docker run -d --rm --name "$NAME" \
  -p "127.0.0.1:$PORT:8080" \
  -e TOKEN_SECRET=docker-test-secret-not-a-real-key \
  -e DATA_DIR=/data/router \
  -e AUDIT_LOG=/data/router/audit.jsonl \
  -e CLAUDE_CODE_HOME=/data/claude \
  -v "$WORK/claude:/data/claude:ro" \
  -v "$WORK/router:/data/router" \
  "$IMAGE" serve >/dev/null

for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$PORT/health" >/dev/null && break
  sleep 0.5
done
curl -sf "http://127.0.0.1:$PORT/health" >/dev/null &&
  check "container serves /health" ok || check "container serves /health" "no response"

# The credential copy must stay untouched: the mount is read-only.
WRITE=$(docker exec "$NAME" sh -c 'echo x >> /data/claude/.credentials.json' 2>&1 || true)
[[ -n "$WRITE" ]] && check "credential copy is mounted read-only" ok ||
  check "credential copy is mounted read-only" "write succeeded"
cmp -s "$HOME/.claude/.credentials.json" "$WORK/claude/.credentials.json" &&
  check "credential copy is byte-identical to the original" ok ||
  check "credential copy is byte-identical to the original" "copy differs"

TOKEN=$(curl -s -X POST "http://127.0.0.1:$PORT/api/tokens" \
  -H 'Content-Type: application/json' \
  -d '{"ttl_hours":1,"label":"docker-live-test","max_requests":10}' |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')
[[ "$TOKEN" == la_sk_* ]] && check "per-task token issued" ok ||
  check "per-task token issued" "got: ${TOKEN:0:12}"

# --- Use case: Claude Code / any Anthropic-dialect client -------------------
MSG=$(curl -s "http://127.0.0.1:$PORT/v1/messages" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":32,
       "messages":[{"role":"user","content":"Reply with exactly: ROUTER_OK"}]}')
echo "$MSG" | redact >"$OUT/docker-v1-messages.json"
contains "/v1/messages returns an Anthropic message" "$MSG" '"type":"message"'
contains "/v1/messages reached the live model" "$MSG" 'ROUTER_OK'

# --- Use case: Claude MAX inside Codex (OpenAI Responses dialect) -----------
RESP=$(curl -s "http://127.0.0.1:$PORT/v1/responses" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5-codex","max_output_tokens":32,
       "input":[{"role":"user","content":"Reply with exactly: CODEX_OK"}]}')
echo "$RESP" | redact >"$OUT/docker-v1-responses.json"
contains "/v1/responses is served from the Claude MAX subscription" "$RESP" 'CODEX_OK'

# --- Streaming, as documented for both dialects -----------------------------
MSG_SSE=$(curl -sN "http://127.0.0.1:$PORT/v1/messages" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":32,"stream":true,
       "messages":[{"role":"user","content":"count to three"}]}')
echo "$MSG_SSE" | redact >"$OUT/docker-v1-messages-stream.sse"
for event in message_start content_block_delta message_stop; do
  contains "/v1/messages stream emits $event" "$MSG_SSE" "event: $event"
done

RESP_SSE=$(curl -sN "http://127.0.0.1:$PORT/v1/responses" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5-codex","max_output_tokens":32,"stream":true,
       "input":[{"role":"user","content":"count to three"}]}')
echo "$RESP_SSE" | redact >"$OUT/docker-v1-responses-stream.sse"
for event in response.created response.output_text.delta response.completed; do
  contains "/v1/responses stream emits $event" "$RESP_SSE" "$event"
done

# --- Audit trail and metrics ------------------------------------------------
AUDIT=$(cat "$WORK/router/audit.jsonl" 2>/dev/null || echo '')
echo "$AUDIT" | redact >"$OUT/docker-audit.jsonl"
contains "audit log records the task label" "$AUDIT" '"label":"docker-live-test"'
contains "audit log records the anthropic surface" "$AUDIT" '"surface":"anthropic"'
contains "audit log records the openai responses surface" "$AUDIT" '"surface":"openai_responses"'
if [[ "$AUDIT" == *"la_sk_"* ]]; then
  check "audit log never contains a token string" "found la_sk_"
else
  check "audit log never contains a token string" ok
fi

METRICS=$(curl -s "http://127.0.0.1:$PORT/metrics")
echo "$METRICS" | redact >"$OUT/docker-metrics.txt"
contains "metrics expose the per-task counter" "$METRICS" 'label="docker-live-test"'

docker logs "$NAME" 2>&1 | redact >"$OUT/docker-router-startup.txt"

echo
echo "passed: $PASS  failed: $FAIL"
echo "evidence in $OUT"
[[ "$FAIL" -eq 0 ]]
