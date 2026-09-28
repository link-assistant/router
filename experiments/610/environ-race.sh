#!/bin/bash
# Issue #610 follow-up: can /proc/<pid>/environ of a same-user process named
# like a client be unreadable? Runs a fake `claude` shell loop (as the test
# does) and repeatedly reads the environment of every `pgrep -x claude` hit.
dir=$(mktemp -d)
printf '#!/bin/sh\nwhile :; do sleep 0.01; done\n' > "$dir/claude"
chmod 755 "$dir/claude"
"$dir/claude" & loop=$!
end=$((SECONDS + ${1:-20}))
while [ $SECONDS -lt $end ]; do
  for pid in $(pgrep -x claude); do
    err=$(cat /proc/$pid/environ 2>&1 >/dev/null) || echo "pid=$pid owner=$(stat -c %U /proc/$pid 2>/dev/null) state=$(awk '/^State/{print $2}' /proc/$pid/status 2>/dev/null) err=$err"
  done
done | sort | uniq -c | sort -rn | head
kill $loop; rm -rf "$dir"
