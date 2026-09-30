#!/bin/sh
# Reproduce #636 only in a disposable macOS account. Never run vendor clients.
set -eu
[ "$(uname -s)" = Darwin ] || { echo 'macOS reproduction not available'; exit 0; }
fixture_dir=$(mktemp -d)
fixture_pid=
trap 'if [ -n "$fixture_pid" ]; then kill "$fixture_pid" 2>/dev/null || :; wait "$fixture_pid" 2>/dev/null || :; fi; rm -rf "$fixture_dir"' EXIT INT TERM
cp /bin/sleep "$fixture_dir/claude"
codesign --force --sign - "$fixture_dir/claude"
codesign --verify "$fixture_dir/claude"
"$fixture_dir/claude" 2 &
fixture_pid=$!
wait "$fixture_pid" || { status=$?; echo "copied fixture exit=$status"; exit "$status"; }
