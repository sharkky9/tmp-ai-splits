# Codex Quality-Gate Playbook

> **Paths:** All commands below are executed **inside `app_code/`**, because that folder holds `package.json`.

Codex must perform these steps, in order, for every task:

1. `pnpm install --frozen-lockfile --prefer-offline`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run test --ci --coverage`

If any step fails, the change is rejected.

