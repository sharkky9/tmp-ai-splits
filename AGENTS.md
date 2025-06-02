# Codex Quality-Gate Playbook

> **Working directory:** All commands below are executed **inside `app_code/`**, because that folder holds `package.json`.

This playbook supports both **online** and **offline** environments.

---

## 1  Online mode (default)

When registry access is available, Codex **MUST** run the full quality-gate for every task **in order**:

1. `pnpm install --frozen-lockfile --prefer-offline`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run test --ci --coverage`

If any step fails, the change is rejected.

---

## 2  Offline mode (registry unavailable)

If the environment cannot reach a package registry, Codex **SHOULD** continue implementation and defer the quality-gate to CI.  
Use the command below to detect offline mode:

```bash
pnpm install --offline --frozen-lockfile \
  || echo "🔒 Offline environment detected – skipping local quality-gate"
