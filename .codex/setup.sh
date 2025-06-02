#!/usr/bin/env bash
set -euo pipefail

# 1. Install Node 18 + pnpm 8
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install 18
nvm use 18
corepack enable
pnpm install -g pnpm@8

# 👉  NEW: move into the directory that holds package.json
cd app_code

# 2. Install dependencies (offline-safe)
pnpm install --frozen-lockfile --prefer-offline

# Playwright browsers (only if Playwright is in deps)
if pnpm exec --yes playwright --version >/dev/null 2>&1; then
  pnpm exec playwright install --with-deps
fi

# 3. Quality gates
pnpm run lint
pnpm run typecheck
pnpm run test --ci --coverage
