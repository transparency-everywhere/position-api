#!/bin/sh
# Runs the integration suites, each in its own jest process.
#
# They are deliberately not run together. Every suite drives real browsers
# against live sources, and sharing one process meant async work from a
# finished suite failed the next one with "Test environment has been torn
# down", while browser pressure from one suite starved the launches in
# another. A separate process per suite costs a few seconds of startup and
# removes both problems.
#
# --experimental-vm-modules lets jest's CommonJS runtime service the dynamic
# import that loads ESM-only puppeteer (see src/lib/esm.ts).
# --forceExit ends the process once the results are in: a scraper can leave a
# socket or a browser handle behind, and jest otherwise waits on it.
set -u

status=0

for suite in test/integration/*.integration.test.ts; do
  echo ""
  echo "=== $suite ==="
  if ! NODE_OPTIONS=--experimental-vm-modules npx jest \
    --testPathIgnorePatterns "/node_modules/" \
    --runInBand \
    --forceExit \
    "$suite"; then
    status=1
  fi
done

echo ""
if [ "$status" -eq 0 ]; then
  echo "All integration suites passed."
else
  echo "At least one integration suite failed."
fi

exit "$status"
