#!/bin/sh
# Tests link to this executable and write only the shell body. A concurrent
# fork can inherit a writable body descriptor without blocking execution.
printf '%s\n' "$@" > "$0.arguments"
cat > "$0.input"
. "$0.body"
