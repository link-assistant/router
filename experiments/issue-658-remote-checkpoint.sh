#!/usr/bin/env bash
# Run src/deploy/data_checkpoint.js against a temporary data root (issue #658):
# oversized request logs must not block; an oversized session file must name
# its path and the budget.
set -euo pipefail
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/bin" "$work/data/requests/t" "$work/data/sessions"
printf '#!/bin/sh\necho "[]"\n' > "$work/bin/router"; chmod +x "$work/bin/router"
truncate -s 300M "$work/data/requests/t/requests.lino"
script="$(sed "s#const root = '/data/router';#const root = '$work/data';#" src/deploy/data_checkpoint.js)"
PATH="$work/bin:$PATH" TOKEN_SECRET=s node -e "$script" && echo "oversized request logs: checkpoint ok"
truncate -s 300M "$work/data/sessions/huge.lino"
if PATH="$work/bin:$PATH" TOKEN_SECRET=s node -e "$script" 2>"$work/err"; then
  echo "unexpected success"; exit 1
fi
grep -o "checkpoint exceeds.*" "$work/err"
