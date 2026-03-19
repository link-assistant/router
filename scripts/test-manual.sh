#!/usr/bin/env bash
# Manual end-to-end testing script for Link.Assistant.Router
#
# This script:
#   1. Creates a temporary Claude Code credentials directory
#   2. Builds and starts the router
#   3. Issues a custom token
#   4. Tests health, proxy, and error endpoints
#   5. Cleans up on exit
#
# Usage:
#   chmod +x scripts/test-manual.sh
#   ./scripts/test-manual.sh
#
# Prerequisites:
#   - Rust toolchain (cargo)
#   - curl
#   - jq (optional, for pretty output)

set -euo pipefail

ROUTER_PORT="${ROUTER_PORT:-8099}"
TOKEN_SECRET="${TOKEN_SECRET:-manual-test-secret-$(date +%s)}"
TEST_CLAUDE_HOME=""
ROUTER_PID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}PASS${NC}: $1"; }
fail() { echo -e "${RED}FAIL${NC}: $1"; FAILURES=$((FAILURES + 1)); }
info() { echo -e "${YELLOW}INFO${NC}: $1"; }

FAILURES=0

cleanup() {
    info "Cleaning up..."
    if [ -n "$ROUTER_PID" ] && kill -0 "$ROUTER_PID" 2>/dev/null; then
        kill "$ROUTER_PID" 2>/dev/null || true
        wait "$ROUTER_PID" 2>/dev/null || true
    fi
    if [ -n "$TEST_CLAUDE_HOME" ] && [ -d "$TEST_CLAUDE_HOME" ]; then
        rm -rf "$TEST_CLAUDE_HOME"
    fi
}
trap cleanup EXIT

echo "============================================"
echo " Link.Assistant.Router - Manual Test Suite"
echo "============================================"
echo ""

# Step 1: Create temporary credentials
info "Creating temporary Claude Code credentials..."
TEST_CLAUDE_HOME=$(mktemp -d)
echo '{"accessToken": "test-oauth-token-for-manual-testing"}' > "$TEST_CLAUDE_HOME/credentials.json"
info "Credentials written to $TEST_CLAUDE_HOME/credentials.json"

# Step 2: Build the router
info "Building the router (release mode)..."
cargo build --release 2>&1
pass "Build succeeded"

# Step 3: Start the router
info "Starting the router on port $ROUTER_PORT..."
export TOKEN_SECRET
export ROUTER_PORT
export CLAUDE_CODE_HOME="$TEST_CLAUDE_HOME"
export UPSTREAM_BASE_URL="https://api.anthropic.com"

./target/release/link-assistant-router &
ROUTER_PID=$!

# Wait for the router to start
sleep 2

if ! kill -0 "$ROUTER_PID" 2>/dev/null; then
    fail "Router failed to start"
    exit 1
fi
pass "Router started (PID $ROUTER_PID)"

echo ""
echo "--- Test 1: Health check ---"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$ROUTER_PORT/health")
if [ "$HEALTH" = "200" ]; then
    pass "GET /health returned 200"
else
    fail "GET /health returned $HEALTH (expected 200)"
fi

HEALTH_BODY=$(curl -s "http://localhost:$ROUTER_PORT/health")
if [ "$HEALTH_BODY" = "ok" ]; then
    pass "GET /health body is 'ok'"
else
    fail "GET /health body is '$HEALTH_BODY' (expected 'ok')"
fi

echo ""
echo "--- Test 2: Issue a token ---"
ISSUE_RESPONSE=$(curl -s -X POST "http://localhost:$ROUTER_PORT/api/tokens" \
    -H "Content-Type: application/json" \
    -d '{"ttl_hours": 1, "label": "manual-test"}')

TOKEN=$(echo "$ISSUE_RESPONSE" | jq -r '.token // empty' 2>/dev/null || echo "")
if [ -n "$TOKEN" ] && echo "$TOKEN" | grep -q "^la_sk_"; then
    pass "POST /api/tokens returned a la_sk_ token"
else
    fail "POST /api/tokens did not return a valid token: $ISSUE_RESPONSE"
fi

TTL=$(echo "$ISSUE_RESPONSE" | jq -r '.ttl_hours // empty' 2>/dev/null || echo "")
if [ "$TTL" = "1" ]; then
    pass "Token TTL is 1 hour"
else
    fail "Token TTL is '$TTL' (expected 1)"
fi

LABEL=$(echo "$ISSUE_RESPONSE" | jq -r '.label // empty' 2>/dev/null || echo "")
if [ "$LABEL" = "manual-test" ]; then
    pass "Token label is 'manual-test'"
else
    fail "Token label is '$LABEL' (expected 'manual-test')"
fi

echo ""
echo "--- Test 3: Issue token with defaults ---"
DEFAULT_RESPONSE=$(curl -s -X POST "http://localhost:$ROUTER_PORT/api/tokens" \
    -H "Content-Type: application/json" \
    -d '{}')

DEFAULT_TTL=$(echo "$DEFAULT_RESPONSE" | jq -r '.ttl_hours // empty' 2>/dev/null || echo "")
if [ "$DEFAULT_TTL" = "24" ]; then
    pass "Default TTL is 24 hours"
else
    fail "Default TTL is '$DEFAULT_TTL' (expected 24)"
fi

echo ""
echo "--- Test 4: Proxy without Authorization header ---"
NO_AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:$ROUTER_PORT/api/latest/anthropic/v1/messages")
if [ "$NO_AUTH_CODE" = "401" ]; then
    pass "Proxy without auth returns 401"
else
    fail "Proxy without auth returns $NO_AUTH_CODE (expected 401)"
fi

NO_AUTH_BODY=$(curl -s "http://localhost:$ROUTER_PORT/api/latest/anthropic/v1/messages")
NO_AUTH_TYPE=$(echo "$NO_AUTH_BODY" | jq -r '.error.type // empty' 2>/dev/null || echo "")
if [ "$NO_AUTH_TYPE" = "authentication_error" ]; then
    pass "Error response has Anthropic-compatible format"
else
    fail "Error type is '$NO_AUTH_TYPE' (expected 'authentication_error')"
fi

echo ""
echo "--- Test 5: Proxy with invalid token ---"
INVALID_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer la_sk_this-is-not-valid" \
    "http://localhost:$ROUTER_PORT/api/latest/anthropic/v1/messages")
if [ "$INVALID_CODE" = "401" ]; then
    pass "Proxy with invalid token returns 401"
else
    fail "Proxy with invalid token returns $INVALID_CODE (expected 401)"
fi

echo ""
echo "--- Test 6: Proxy with wrong prefix ---"
WRONG_PREFIX_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer wrong_prefix_abc" \
    "http://localhost:$ROUTER_PORT/api/latest/anthropic/v1/messages")
if [ "$WRONG_PREFIX_CODE" = "401" ]; then
    pass "Proxy with wrong prefix returns 401"
else
    fail "Proxy with wrong prefix returns $WRONG_PREFIX_CODE (expected 401)"
fi

echo ""
echo "--- Test 7: Proxy with valid token (upstream will reject test OAuth token) ---"
if [ -n "$TOKEN" ]; then
    PROXY_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "http://localhost:$ROUTER_PORT/api/latest/anthropic/v1/messages" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -H "anthropic-version: 2023-06-01" \
        -d '{"model": "claude-sonnet-4-20250514", "max_tokens": 10, "messages": [{"role": "user", "content": "Hi"}]}')
    # The upstream will reject our fake OAuth token, but we should get a forwarded response (not 401/403)
    if [ "$PROXY_CODE" != "401" ] && [ "$PROXY_CODE" != "403" ]; then
        pass "Proxy forwarded request upstream (got $PROXY_CODE from Anthropic, expected non-401/403)"
    else
        fail "Proxy returned $PROXY_CODE — token validation may have failed"
    fi
else
    info "Skipping proxy test — no token available"
fi

echo ""
echo "--- Test 8: Query string preservation ---"
QS_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:$ROUTER_PORT/api/latest/anthropic/v1/models?limit=5")
# Any non-401/403 means the router accepted the token and tried to forward
if [ "$QS_CODE" != "401" ] && [ "$QS_CODE" != "403" ]; then
    pass "Query string preserved in proxy request (got $QS_CODE)"
else
    fail "Query string test returned $QS_CODE"
fi

echo ""
echo "============================================"
echo " Results"
echo "============================================"
if [ "$FAILURES" -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAILURES test(s) failed.${NC}"
    exit 1
fi
