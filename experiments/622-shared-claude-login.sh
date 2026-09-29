#!/usr/bin/env bash
# Issue #622: deploy with --claude-credentials share against real Docker, using
# a stand-in Claude Code login in a temporary CLAUDE_CONFIG_DIR. Never touches
# the operator's real ~/.claude. Prints no credential bytes.
set -u
IMAGE=${IMAGE:-ghcr.io/link-assistant/router:1.14.2}
BIN=${BIN:-target/debug/link-assistant-router}
work=$(mktemp -d); home=$work/claude; root=$work/deploy; mkdir -p "$home"
far=$(( ($(date +%s) + 86400) * 1000 ))
printf '{"claudeAiOauth":{"accessToken":"sk-ant-oat01-standin-A","refreshToken":"sk-ant-ort01-standin-A","expiresAt":%s,"scopes":["user:inference"]}}' "$far" > "$home/.credentials.json"
chmod 600 "$home/.credentials.json"
port=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')
run() { CLAUDE_CONFIG_DIR=$home TOKEN_SECRET=experiment-622-secret NO_COLOR=1 "$BIN" deploy --port "$port" --image "$IMAGE" --root "$root" --data-dir "$root/state" "$@"; }
echo "== deploy --claude-credentials share"; run --claude-credentials share > "$work/out1" 2>&1; echo "exit=$?"
grep -E "anthropic_credential|error" "$work/out1"
grep -c standin "$work/out1" | sed 's/^/credential bytes in output: /'
backend=$(tr -d '\n' < "$root/state/current")
echo "backend=$backend uid-in-container=$(docker exec "$backend" id -u) host-uid=$(id -u)"
cmp <(docker exec "$backend" cat /data/claude/.credentials.json) "$home/.credentials.json" && echo "container reads the host file"
sed -i 's/standin-A/standin-B/g' "$home/.credentials.json"
docker exec "$backend" grep -q standin-B /data/claude/.credentials.json && echo "host rewrite visible in container"
docker exec "$backend" sh -c 'echo probe > /data/claude/probe' && stat -c 'container-written file owner=%u' "$home/probe"
status=$(docker exec -e NO_COLOR=1 "$backend" router auth status 2>&1)
echo "== auth status inside the backend:"; echo "$status" | grep -i -E "claude|anthropic"
echo "$status" | grep -c standin | sed 's/^/credential bytes in auth status: /'
echo "== health: $(curl -s "http://127.0.0.1:$port/api/health" | head -c 600)"
echo "== second deploy without the flag (should keep share, no-op)"; run > "$work/out2" 2>&1; echo "exit=$?"
grep -E "anthropic_credential|acted|no-op|converged" "$work/out2" | head -5
echo "backend unchanged: $([ "$(tr -d '\n' < "$root/state/current")" = "$backend" ] && echo yes || echo no)"
echo "== status"; run --status 2>&1 | grep -E "claude|anthropic"
echo "== down"; run --down --yes > /dev/null 2>&1; echo "exit=$?"
stat -c 'state/connections owner=%u' "$root"/state/connections/* 2>/dev/null
docker run --rm -v "$work:/w" alpine rm -rf /w/deploy/state/connections >/dev/null 2>&1; rm -rf "$work"
