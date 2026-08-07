#!/usr/bin/env bash
# A stand-in for `claude setup-token` used by the login-flow tests and by
# anyone who wants to exercise `POST /api/login` without a real Anthropic
# account.
#
# It behaves like the real TUI in the ways the router depends on:
#   * it repaints, printing the authorization URL more than once,
#   * it hard-wraps nothing itself and relies on the terminal,
#   * it waits on stdin for the code the human pastes,
#   * it prints a `sk-ant-oat…` token on success and exits 0,
#   * it prints `Invalid code` and exits 1 when the code is rejected.
#
# The accepted code is `$FAKE_LOGIN_EXPECTED_CODE` (default: `good-code`).
set -u
expected="${FAKE_LOGIN_EXPECTED_CODE:-good-code}"
url="https://claude.ai/oauth/authorize?code=true&state=fake-$$&scope=user%3Ainference"

printf '\033[2J\033[H'
printf '\033[1mClaude Code login\033[0m\r\n'
printf 'Open this URL in your browser:\r\n\r\n'
printf '%s\r\n\r\n' "$url"
# Repaint, exactly like the real TUI does.
printf '\033[H\033[1mClaude Code login\033[0m\r\n'
printf 'Open this URL in your browser:\r\n\r\n'
printf '%s\r\n\r\n' "$url"
printf 'Paste code here: '

IFS= read -r code
code="${code%$'\r'}"

if [ "$code" = "$expected" ]; then
  printf '\r\nLogin successful.\r\n'
  printf 'sk-ant-oat01-FAKE%s\r\n' "0123456789abcdef"
  exit 0
fi

printf '\r\nInvalid code\r\n'
exit 1
