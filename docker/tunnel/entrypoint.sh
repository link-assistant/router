#!/bin/sh
set -eu

: "${TUNNEL_SSH_HOST:?TUNNEL_SSH_HOST is required}"
: "${TUNNEL_SSH_USER:?TUNNEL_SSH_USER is required}"
: "${TUNNEL_REMOTE_PORT:?TUNNEL_REMOTE_PORT is required}"
: "${TUNNEL_SSH_KEY:?TUNNEL_SSH_KEY is required}"

if [ ! -r "$TUNNEL_SSH_KEY" ]; then
  echo "TUNNEL_SSH_KEY is not readable: $TUNNEL_SSH_KEY" >&2
  exit 1
fi

AUTOSSH_GATETIME=0
export AUTOSSH_GATETIME

exec "${AUTOSSH_BIN:-autossh}" \
  -M 0 \
  -N \
  -i "$TUNNEL_SSH_KEY" \
  -p "${TUNNEL_SSH_PORT:-22}" \
  -o BatchMode=yes \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=accept-new \
  -o "UserKnownHostsFile=${TUNNEL_KNOWN_HOSTS:-/home/tunnel/.ssh/known_hosts}" \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -R "${TUNNEL_REMOTE_BIND:-127.0.0.1}:${TUNNEL_REMOTE_PORT}:${ROUTER_HOST:-link-assistant-router}:${ROUTER_PORT:-8080}" \
  "${TUNNEL_SSH_USER}@${TUNNEL_SSH_HOST}"
