#!/usr/bin/env bash
# Helper launched by dev.sh — not intended to be run directly.
cd "$(dirname "${BASH_SOURCE[0]}")/../server"
NODE_ENV=development node index.js
