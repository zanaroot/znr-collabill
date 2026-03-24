#!/usr/bin/env sh

set -eu

if [ "${1:-}" = "--" ]; then
  shift
fi

pnpm exec dotenvx set "$@" -f .env.dev
