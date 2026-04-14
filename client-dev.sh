#!/usr/bin/env bash
# Helper launched by dev.sh — not intended to be run directly.
cd "$(dirname "${BASH_SOURCE[0]}")"

export NODE_OPTIONS=--openssl-legacy-provider
export NODE_ENV=development

SKIP_BUILD=false
BUILD_ONLY=false
[[ "$1" == "--skip-build" ]] && SKIP_BUILD=true
[[ "$1" == "--build-only" ]] && BUILD_ONLY=true

if [ "$SKIP_BUILD" = false ]; then
  echo "► npm run build"
  npm run build || { echo ""; echo "✗ Build failed — fix errors before continuing."; read -rp "Press enter to close..."; exit 1; }

  echo ""
  echo "► npm run lint"
  npm run lint || { echo ""; echo "✗ Lint failed — fix errors before continuing."; read -rp "Press enter to close..."; exit 1; }
fi

[ "$BUILD_ONLY" = true ] && { echo ""; echo "✓ Build complete."; exit 0; }

echo ""
echo "► Opening http://localhost:8080/ in browser..."
start "" "http://localhost:8080/"

echo ""
echo "► npm run serve"
npm run serve
