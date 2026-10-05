#!/bin/sh
# Router SSH tunnel companion.
#
#   TUNNEL_MODE=reverse (default)  republish the Router on a far-side host (-R).
#   TUNNEL_MODE=forward            reach a remote Router from this machine (-L),
#                                  bound to 127.0.0.1 only (issue #682).
set -eu

mode="${TUNNEL_MODE:-reverse}"

: "${TUNNEL_SSH_HOST:?TUNNEL_SSH_HOST is required}"
: "${TUNNEL_SSH_USER:?TUNNEL_SSH_USER is required}"
case "$mode" in
  reverse) : "${TUNNEL_REMOTE_PORT:?TUNNEL_REMOTE_PORT is required}" ;;
  forward) : "${TUNNEL_LOCAL_PORT:?TUNNEL_LOCAL_PORT is required in forward mode}" ;;
  *)
    echo "TUNNEL_MODE must be reverse or forward, not: $mode" >&2
    exit 1
    ;;
esac
: "${TUNNEL_SSH_KEY:?TUNNEL_SSH_KEY is required}"
: "${TUNNEL_KNOWN_HOSTS:?TUNNEL_KNOWN_HOSTS is required}"

if [ "$(id -u)" = 0 ]; then
  echo "the tunnel runs as an unprivileged user; do not run it as root" >&2
  exit 1
fi
# `router tunnel up --via docker` runs the companion as the owner of the
# mounted key (`--user uid:gid --group-add 0`). ssh needs a passwd entry for
# its user, so give such a uid one; /etc/passwd is writable by group 0 only.
if ! id -un >/dev/null 2>&1 && [ -w /etc/passwd ]; then
  printf 'tunnel-%s:x:%s:%s::/tmp:/sbin/nologin\n' "$(id -u)" "$(id -u)" "$(id -g)" >> /etc/passwd
  HOME=/tmp
  export HOME
fi
if [ ! -r "$TUNNEL_SSH_KEY" ]; then
  echo "TUNNEL_SSH_KEY is not readable: $TUNNEL_SSH_KEY" >&2
  exit 1
fi
if [ ! -s "$TUNNEL_KNOWN_HOSTS" ]; then
  echo "TUNNEL_KNOWN_HOSTS must be a readable, non-empty pinned host-key file: $TUNNEL_KNOWN_HOSTS" >&2
  exit 1
fi

# A bind-mounted key often keeps the host's looser mode, which ssh refuses
# ("UNPROTECTED PRIVATE KEY FILE"). Copy such a key to a 0600 file this user
# owns instead of asking the operator to change the host file's mode.
key="$TUNNEL_SSH_KEY"
if [ "$(ls -lnL -- "$key" | cut -c5-10)" != "------" ]; then
  umask 077
  key="$(mktemp "${TMPDIR:-/tmp}/tunnel-key.XXXXXX")"
  cat -- "$TUNNEL_SSH_KEY" > "$key"
  chmod 0600 "$key"
fi

if [ "$mode" = forward ]; then
  # Loopback only: never GatewayPorts, never a wildcard bind.
  forward="-L"
  spec="127.0.0.1:${TUNNEL_LOCAL_PORT}:${TUNNEL_TARGET_HOST:-127.0.0.1}:${TUNNEL_TARGET_PORT:-8080}"
else
  forward="-R"
  spec="${TUNNEL_REMOTE_BIND:-127.0.0.1}:${TUNNEL_REMOTE_PORT}:${ROUTER_HOST:-link-assistant-router}:${ROUTER_PORT:-8080}"
fi

AUTOSSH_GATETIME=0
export AUTOSSH_GATETIME

exec "${AUTOSSH_BIN:-autossh}" \
  -M 0 \
  -N \
  -i "$key" \
  -p "${TUNNEL_SSH_PORT:-22}" \
  -o BatchMode=yes \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=${TUNNEL_KNOWN_HOSTS}" \
  -o GatewayPorts=no \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  "$forward" "$spec" \
  "${TUNNEL_SSH_USER}@${TUNNEL_SSH_HOST}"
