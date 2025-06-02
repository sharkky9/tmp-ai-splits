#!/usr/bin/env bash
#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# 1. Install Node 18 LTS and activate pnpm 8 via Corepack
# ------------------------------------------------------------
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install 18
nvm use 18

corepack enable
corepack prepare pnpm@8 --activate     # installs pnpm 8 and puts it on PATH
pnpm --version                         # sanity-check (prints 8.x)

# ------------------------------------------------------------
# 2. Install dependencies inside app_code (force-upgrade lockfile)
# ------------------------------------------------------------
cd app_code
pnpm install --force --prefer-offline  # ignores older lockfile formats

# ------------------------------------------------------------
# 3. Quality gates — fail the task if any step errors
# ------------------------------------------------------------
pnpm run lint
pnpm run typecheck
pnpm run test --ci --coverage
