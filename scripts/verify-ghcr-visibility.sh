#!/usr/bin/env bash
# Verify that GHCR grants an anonymous pull token for the package just published.
# Deliberately do not add authentication here: credentials would make a private
# package look public and defeat this release gate.
set -euo pipefail

GHCR_IMAGE="${GHCR_IMAGE:-}"
GHCR_TOKEN_ENDPOINT="${GHCR_TOKEN_ENDPOINT:-https://ghcr.io/token}"
retries="${VERIFY_GHCR_VISIBILITY_RETRIES:-3}"
delay="${VERIFY_GHCR_VISIBILITY_DELAY:-5}"

trace() {
  if [ "${VERIFY_GHCR_VISIBILITY_VERBOSE:-}" = "1" ]; then
    echo "verify-ghcr-visibility: $*" >&2
  fi
}

if [ -z "$GHCR_IMAGE" ]; then
  echo "::error::GHCR_IMAGE is not set; nothing to verify"
  exit 1
fi
if ! [[ "$retries" =~ ^[1-9][0-9]*$ ]]; then
  echo "::error::VERIFY_GHCR_VISIBILITY_RETRIES must be a positive integer"
  exit 1
fi
if ! [[ "$delay" =~ ^[0-9]+$ ]]; then
  echo "::error::VERIFY_GHCR_VISIBILITY_DELAY must be a non-negative integer"
  exit 1
fi

repository="${GHCR_IMAGE#ghcr.io/}"
repository="${repository%%@*}"
repository="${repository%%:*}"
scope="repository:${repository}:pull"

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

attempt=1
while :; do
  if status="$(curl --silent --show-error --connect-timeout 10 --max-time 30 \
    -o "$body" -w '%{http_code}' \
    "${GHCR_TOKEN_ENDPOINT}?service=ghcr.io&scope=${scope}")"; then
    :
  else
    status="000"
  fi
  trace "attempt ${attempt}/${retries} -> HTTP ${status}"

  case "$status" in
    200)
      if grep -Eq '"token"[[:space:]]*:[[:space:]]*"[^"[:space:]][^"]*"' "$body"; then
        echo "OK: ${GHCR_IMAGE} is public (GHCR issued an anonymous pull token)"
        exit 0
      fi
      echo "::error::GHCR returned HTTP 200 for ${GHCR_IMAGE} but did not include a pull token"
      exit 1
      ;;
    401)
      echo "::error::${GHCR_IMAGE} is PRIVATE; anonymous pulls are unauthorized."
      echo "An organization owner must open the package settings and change its visibility to Public, then rerun this job."
      exit 1
      ;;
    403)
      echo "::error::${GHCR_IMAGE} is DENIED to anonymous callers; the package may be missing or unavailable."
      exit 1
      ;;
    000 | 5??)
      if [ "$attempt" -ge "$retries" ]; then
        echo "::error::The GHCR token endpoint kept failing for ${GHCR_IMAGE} (last status ${status}) after ${retries} attempt(s)"
        exit 1
      fi
      trace "transient status ${status}; retrying in ${delay}s"
      attempt=$((attempt + 1))
      sleep "$delay"
      ;;
    *)
      echo "::error::Unexpected HTTP ${status} from the GHCR token endpoint for ${GHCR_IMAGE}"
      exit 1
      ;;
  esac
done
