#!/usr/bin/env bash
set -euo pipefail

HTTPDOCS="/var/www/vhosts/squarepickle.com/httpdocs"
export PATH="/opt/plesk/node/22/bin:$PATH"
PNPM="/opt/plesk/node/22/lib/node_modules/corepack/shims/pnpm"

echo "[deploy] SquarePickle — $(date -Is)"

# Write git SHA
git rev-parse HEAD > "$HTTPDOCS/.git-sha" 2>/dev/null || true

# Build the dapp
cd "$HTTPDOCS/dapps"
$PNPM install --frozen-lockfile
$PNPM build

# Copy dist output to httpdocs root (what Plesk serves)
cp -r "$HTTPDOCS/dapps/dist/." "$HTTPDOCS/"

echo "[deploy] Done — $(git -C $HTTPDOCS rev-parse --short HEAD 2>/dev/null)"
