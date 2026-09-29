#!/usr/bin/env bash
# Issue #625 (control): with ONE secret, does a token signed under secret A authorize /api/models on a
# backend started with secret A (200) and one started with secret B (401)?
# Secrets are throwaway test values; the token never reaches argv.
set -euo pipefail
IMAGE=${IMAGE:-ghcr.io/link-assistant/router:1.14.3}
DATA=$(mktemp -d)
chmod 777 "$DATA"
cleanup() { docker rm -f probe-625-a probe-625-b >/dev/null 2>&1 || true; }
trap cleanup EXIT
TOKEN_SECRET=experiment-secret-a docker run -d --name probe-625-a -e TOKEN_SECRET -v "$DATA:/data/router" "$IMAGE" serve >/dev/null
TOKEN_SECRET=experiment-secret-a docker run -d --name probe-625-b -e TOKEN_SECRET -v "$DATA:/data/router" "$IMAGE" serve >/dev/null
sleep 5
PROBE=$(docker exec probe-625-a router tokens issue --label deploy-probe --ttl-hours 1 | tail -n1)
check() {
  ROUTER_PROBE_TOKEN="$PROBE" docker exec -e ROUTER_PROBE_TOKEN -e PROBE_PATH "$1" bun -e \
    "const r=await fetch('http://127.0.0.1:8080'+(process.env.PROBE_PATH||'/api/models'),{headers:{authorization:'Bearer '+process.env.ROUTER_PROBE_TOKEN}});console.log(r.status, (await r.text()).slice(0,300))"
}
echo "backend-a status: $(check probe-625-a)"
echo "backend-b status: $(check probe-625-b)"
docker exec probe-625-a router tokens list --json | head -c 300; echo
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' probe-625-a | grep -c '^TOKEN_SECRET=' 
