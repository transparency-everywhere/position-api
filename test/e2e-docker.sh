#!/bin/sh
set -eu

cleanup() {
  docker compose down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "Starting docker compose for e2e..."
docker compose up -d --build

echo "Running docker e2e test..."
# The default jest config skips *.docker.test.ts (they need a running stack),
# so override the ignore list to run this one explicitly.
npx jest --testPathIgnorePatterns "/node_modules/" ./test/e2e.adsb.docker.test.ts --runInBand
