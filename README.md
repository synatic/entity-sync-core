# @synatic/entity-sync-core

Platform-neutral Synatic entity sync library. Generates sync plans from the entity-sync API, writes plan files to disk, and runs preview/execute against destination orgs.

Used by:

- [entity-sync-action](https://github.com/synatic/entity-sync-action) — GitHub Actions wrapper
- [entity-sync-azure-devops](https://github.com/synatic/entity-sync-azure-devops) — Azure Pipelines wrapper

## Install

```bash
npm install @synatic/entity-sync-core
```

## CLI

```bash
entity-sync plan \
  --api-url https://api.example.com \
  --api-key syn_api_... \
  --source-org-id 60ff27eab96f22106d98f1f2 \
  --root-type flow \
  --root-id 507f1f77bcf86cd799439011

entity-sync execute \
  --api-url https://api.example.com \
  --api-key syn_api_... \
  --dest-org-id 507f1f77bcf86cd799439012 \
  --plan-path .synatic/plans/plan.json
```

Multi-root plans:

```bash
entity-sync plan ... \
  --roots '[{"rootType":"parameter","rootId":"P1"},{"rootType":"parameter","rootId":"P2"}]'
```

## Programmatic usage

```js
import { parseConfig, runPlan, runExecute } from "@synatic/entity-sync-core";

const planConfig = parseConfig("plan", {
  apiUrl: "https://api.example.com",
  apiKey: "syn_api_...",
  sourceOrgId: "60ff27eab96f22106d98f1f2",
  rootType: "flow",
  rootId: "507f1f77bcf86cd799439011",
});

const { plan, writtenFiles } = await runPlan(planConfig);
```

Git operations (auto-commit, pull requests) are **not** part of this package — they live in platform adapters.

## Development

```bash
npm install
npm test
npm run lint
```

## Release

1. Merge to `main` and verify CI passes.
2. Create a GitHub Release — CI publishes to npm using `NPM_TOKEN_SYNATIC`.
3. Update consumer repos (`entity-sync-action`, `entity-sync-azure-devops`) to pin the new version.
