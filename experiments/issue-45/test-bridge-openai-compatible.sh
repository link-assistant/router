#!/usr/bin/env bash
# Local end-to-end test of the documented Anthropic-over-OpenAI bridge.
#
# Covers docs/use-cases/chatgpt-in-claude-code.md, per-task-tokens.md and
# audit-and-monitoring.md without needing any vendor subscription: the upstream
# is experiments/issue-45/mock_openai_upstream.py.
#
# Usage: experiments/issue-45/test-bridge-openai-compatible.sh [router-binary]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="${1:-$ROOT/target/release/link-assistant-router}"
MOCK_PORT="${MOCK_PORT:-8899}"
ROUTER_PORT="${ROUTER_PORT:-8891}"
WORK="$(mktemp -d)"
PASS=0
FAIL=0

cleanup() {
  [[ -n "${ROUTER_PID:-}" ]] && kill "$ROUTER_PID" 2>/dev/null || true
  [[ -n "${MOCK_PID:-}" ]] && kill "$MOCK_PID" 2>/dev/null || true
}
trap cleanup EXIT

check() { # check <name> <condition-description> ; reads verdict from $?
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

echo "workdir: $WORK"
python3 "$ROOT/experiments/issue-45/mock_openai_upstream.py" "$MOCK_PORT" &
MOCK_PID=$!

for _ in $(seq 1 50); do
  curl -sf "http://127.0.0.1:$MOCK_PORT/requests" >/dev/null && break
  sleep 0.2
done

TOKEN_SECRET=test-secret-not-a-real-key \
UPSTREAM_PROVIDER=openai-compatible \
OPENAI_COMPATIBLE_PROVIDER_NAME=mock \
OPENAI_COMPATIBLE_BASE_URL="http://127.0.0.1:$MOCK_PORT/v1" \
OPENAI_COMPATIBLE_MODEL=mock-model \
OPENAI_COMPATIBLE_API_KEY=mock-key \
DATA_DIR="$WORK/data" \
AUDIT_LOG="$WORK/audit.jsonl" \
ROUTER_PORT="$ROUTER_PORT" \
ROUTER_HOST=127.0.0.1 \
  "$BIN" serve >"$WORK/router.log" 2>&1 &
ROUTER_PID=$!

for _ in $(seq 1 50); do
  curl -sf "http://127.0.0.1:$ROUTER_PORT/health" >/dev/null && break
  sleep 0.2
done

TOKEN=$(curl -s -X POST "http://127.0.0.1:$ROUTER_PORT/api/tokens" \
  -H 'Content-Type: application/json' \
  -d '{"ttl_hours":1,"label":"bridge-test","max_requests":3}' |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')
[[ "$TOKEN" == la_sk_* ]] && check "token is issued with the la_sk_ prefix" ok ||
  check "token is issued with the la_sk_ prefix" "got: ${TOKEN:0:12}"

# --- 1. Non-streaming /v1/messages -----------------------------------------
RESP=$(curl -s "http://127.0.0.1:$ROUTER_PORT/v1/messages" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":64,
       "system":"be terse",
       "messages":[{"role":"user","content":"say hello"}]}')
echo "$RESP" >"$WORK/messages.json"
contains "reply is an Anthropic message envelope" "$RESP" '"type":"message"'
contains "reply carries the assistant role" "$RESP" '"role":"assistant"'
contains "reply echoes the client's model id" "$RESP" 'claude-sonnet-4-5-20250929'
contains "reply carries the upstream text" "$RESP" 'mock upstream'
contains "reply maps finish_reason to stop_reason" "$RESP" '"stop_reason":"end_turn"'
contains "reply maps upstream usage" "$RESP" '"input_tokens":11'

SEEN=$(curl -s "http://127.0.0.1:$MOCK_PORT/requests")
echo "$SEEN" >"$WORK/upstream-requests.json"
contains "upstream saw an OpenAI chat request" "$SEEN" '/v1/chat/completions'
contains "system prompt became a system message" "$SEEN" '"role": "system"'
contains "upstream model was substituted" "$SEEN" 'mock-model'

# --- 2. Streaming /v1/messages ---------------------------------------------
STREAM=$(curl -sN "http://127.0.0.1:$ROUTER_PORT/v1/messages" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":64,"stream":true,
       "messages":[{"role":"user","content":"say hello"}]}')
echo "$STREAM" >"$WORK/messages-stream.sse"
for event in message_start content_block_start content_block_delta \
  content_block_stop message_delta message_stop; do
  contains "SSE emits $event" "$STREAM" "event: $event"
done
contains "SSE deltas use text_delta" "$STREAM" '"type":"text_delta"'

# --- 3. count_tokens --------------------------------------------------------
COUNT=$(curl -s "http://127.0.0.1:$ROUTER_PORT/v1/messages/count_tokens" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-5-20250929",
       "messages":[{"role":"user","content":"say hello"}]}')
contains "count_tokens returns an estimate" "$COUNT" 'input_tokens'

UNAUTH=$(curl -s -o /dev/null -w '%{http_code}' \
  "http://127.0.0.1:$ROUTER_PORT/v1/messages/count_tokens" \
  -H "Authorization: Bearer la_sk_not_a_valid_token" \
  -H 'Content-Type: application/json' -d '{"messages":[]}')
[[ "$UNAUTH" == "401" ]] && check "count_tokens rejects an invalid token" ok ||
  check "count_tokens rejects an invalid token" "status $UNAUTH"

# --- 4. Per-token budget ----------------------------------------------------
# The token allows 3 upstream requests; two have been spent above.
curl -s -o /dev/null "http://127.0.0.1:$ROUTER_PORT/v1/messages" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"c","max_tokens":8,"messages":[{"role":"user","content":"3"}]}'
OVER=$(curl -s "http://127.0.0.1:$ROUTER_PORT/v1/messages" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"c","max_tokens":8,"messages":[{"role":"user","content":"4"}]}')
contains "budget exhaustion is a rate_limit_error" "$OVER" 'rate_limit_error'

# --- 5. Audit log and metrics ----------------------------------------------
AUDIT=$(cat "$WORK/audit.jsonl")
contains "audit log records the token label" "$AUDIT" '"label":"bridge-test"'
contains "audit log records the provider" "$AUDIT" '"provider":"openai-compatible"'
contains "audit log records the anthropic surface" "$AUDIT" '"surface":"anthropic"'
if [[ "$AUDIT" == *"la_sk_"* ]]; then
  check "audit log never contains a token string" "found la_sk_"
else
  check "audit log never contains a token string" ok
fi

METRICS=$(curl -s "http://127.0.0.1:$ROUTER_PORT/metrics")
echo "$METRICS" >"$WORK/metrics.txt"
contains "metrics expose per-token counters" "$METRICS" \
  'link_assistant_token_requests_total{token='
contains "per-token counter carries the label" "$METRICS" 'label="bridge-test"'

echo
echo "passed: $PASS  failed: $FAIL"
echo "artifacts in $WORK"
[[ "$FAIL" -eq 0 ]]
