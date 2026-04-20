#!/usr/bin/env bash
# dev.sh — launches both development windows and exits.
# Can be run from Git Bash or triggered via VS Code "Run Task".
#
# Usage:
#   ./dev.sh                — full run: build + lint + serve
#   ./dev.sh --skip-build   — skip build & lint, jump straight to serve

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVER_ARGS=()
CLIENT_ARGS=()
[[ "$1" == "--skip-build" ]] && CLIENT_ARGS=("--skip-build")

/usr/bin/mintty --title "Townsquare Server" --hold error \
  -- "$REPO/server-dev.sh" "${SERVER_ARGS[@]}" &

/usr/bin/mintty --title "Townsquare Client" --hold error \
  -- "$REPO/client-dev.sh" "${CLIENT_ARGS[@]}" &
