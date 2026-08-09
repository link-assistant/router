#!/usr/bin/env bash
# A stand-in for the Claude Code login flows used by the login-flow tests and
# by anyone who wants to exercise `POST /api/login` without a real Anthropic
# account. With no arguments it behaves like the TUI `/login` flow; with
# `setup-token` it behaves like that explicit alternative.
#
# It behaves like the real TUI in the ways the router depends on:
#   * a fresh TUI presents the theme and workspace-trust screens,
#   * the TUI waits until `/login` is entered and a login method is selected,
#   * it repaints, printing the authorization URL more than once,
#   * it hard-wraps nothing itself and relies on the terminal,
#   * its TUI accepts the code as bracketed paste, like a terminal emulator,
#   * the TUI writes `.credentials.json`, while `setup-token` prints a token,
#   * it prints `Invalid code` and exits 1 when the code is rejected.
#
# The accepted code is `$FAKE_LOGIN_EXPECTED_CODE` (default: `good-code`).
set -u
expected="${FAKE_LOGIN_EXPECTED_CODE:-good-code}"
mode="${1:-tui}"

if [ "$mode" = "setup-token" ]; then
  url="https://claude.ai/oauth/authorize?code=true&state=fake-$$&scope=user%3Ainference"
elif [ "$mode" = "tui" ]; then
  url="https://claude.com/cai/oauth/authorize?code=true&state=fake-$$&scope=org%3Acreate_api_key+user%3Aprofile+user%3Ainference+user%3Asessions%3Aclaude_code+user%3Amcp_servers+user%3Afile_upload"

  printf "Choose the text style that looks best with your terminal\r\n"
  printf "To change this later, run /theme\r\n"
  IFS= read -r theme
  [ "${theme%$'\r'}" = "" ] || exit 2

  printf "Quick safety check: Is this a project you created or one you trust?\r\n"
  printf "1. Yes, I trust this folder\r\n"
  IFS= read -r trust
  [ "${trust%$'\r'}" = "" ] || exit 2

  printf "Tips for getting started\r\n"
  printf "Not logged in · Run /login\r\n"
  IFS= read -r command
  [ "${command%$'\r'}" = "/login" ] || exit 2

  printf "Select login method:\r\n"
  printf "1. Claude account with subscription\r\n"
  IFS= read -r login_method
  [ "${login_method%$'\r'}" = "" ] || exit 2
else
  printf "unsupported fake login mode: %s\r\n" "$mode"
  exit 2
fi

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

if [ "$mode" = "tui" ]; then
  paste_start=$'\033[200~'
  paste_end=$'\033[201~'
  case "$code" in
    "$paste_start"*"$paste_end")
      code="${code#"$paste_start"}"
      code="${code%"$paste_end"}"
      ;;
    *)
      # Ink positions words with cursor escapes. ANSI stripping therefore
      # yields OAutherror:Invalidcode... rather than a space-preserving line.
      printf '\r\nOAuth\033[7Gerror: Invalid\033[22Gcode. Please make sure the full code was copied\r\n'
      printf 'Press\033[7GEnter\033[13Gto\033[16Gretry.\r\n'
      exit 1
      ;;
  esac
fi

if [ "$code" = "$expected" ]; then
  printf '\r\nLogin successful.\r\n'
  if [ "$mode" = "setup-token" ]; then
    printf 'sk-ant-oat01-FAKE%s\r\n' "0123456789abcdef"
  else
    printf '{"claudeAiOauth":{"accessToken":"sk-ant-oat01-FAKE0123456789abcdef","refreshToken":"sk-ant-ort01-FAKE","expiresAt":4102444800000}}\n' > "$CLAUDE_CONFIG_DIR/.credentials.json"
  fi
  exit 0
fi

printf '\r\nOAuth\033[7Gerror: Invalid\033[22Gcode. Please make sure the full code was copied\r\n'
printf 'Press\033[7GEnter\033[13Gto\033[16Gretry.\r\n'
exit 1
