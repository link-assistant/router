#!/bin/sh
set -eu

printf '%s\n' "$@" > "$0.arguments"
cat > "$0.input"
IFS= read -r status < "$0.exit"
exit "$status"
