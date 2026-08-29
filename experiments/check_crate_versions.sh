#!/usr/bin/env bash
# Print the latest non-yanked crates.io version (and repository) for each crate
# named on the command line. crates.io requires a descriptive User-Agent.
set -euo pipefail
UA="link-assistant-router-dependency-check (link.assistant.team@proton.me)"
for c in "$@"; do
  curl -sS -A "$UA" "https://crates.io/api/v1/crates/$c" \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'crate' not in d:
    print(f'{sys.argv[1]}: NOT FOUND'); raise SystemExit
c = d['crate']
vs = [v for v in d['versions'] if not v['yanked']]
latest = vs[0]['num'] if vs else '?'
print(f\"{c['name']}: {latest}  msrv={vs[0].get('rust_version') if vs else '?'}  repo={c.get('repository')}\")
" "$c"
done
