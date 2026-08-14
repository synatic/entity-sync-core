# @synatic/entity-sync-core

Platform-neutral Synatic entity sync library. Generates sync plans from the entity-sync API, writes plan files to disk, and runs preview/execute against destination orgs.

Used by:

- [entity-sync-action](https://github.com/synatic/entity-sync-action) — GitHub Actions wrapper
- [entity-sync-azure-devops](https://github.com/synatic/entity-sync-azure-devops) — Azure Pipelines wrapper

## Install

```bash
npm install @synatic/entity-sync-core
```

## Root types

Plans are built from one or more **roots**. Each root is an entity in the **source** org that anchors the dependency walk.

| `rootType`     | Description                                      |
| -------------- | ------------------------------------------------ |
| `flow`         | A single flow and its forward dependencies       |
| `solution`     | A solution bundle and all bundled members        |
| `buffer`       | A buffer definition (data is not transferred)    |
| `dataStore`    | A data store and its collections                   |
| `parameter`    | An org parameter (secrets become placeholders)   |
| `relay`        | A relay (new crypto generated on create)         |
| `userGroup`    | A user group (membership is not copied)          |
| `serviceView`  | A service view                                   |
| `flowTrigger`  | A flow trigger                                   |

Single-root plan: `--root-type flow --root-id <id>`

Multi-root plan:

```bash
--roots '[{"rootType":"parameter","rootId":"P1"},{"rootType":"flow","rootId":"F1"}]'
```

## Plan options

Set at **plan time** via `--plan-options` (stored on the committed plan JSON as `plan.options`):

| Option                    | Default | Description |
| ------------------------- | ------- | ----------- |
| `includeReverseDeps`      | `false` | Include entities that depend on the root |
| `includeTriggers`         | `true`  | Include flow triggers reachable from synced flows |
| `adoptNativeOnNameMatch`  | `false` | Overwrite dest entities with the same name but no `syncSource` |

Example:

```bash
entity-sync plan ... --plan-options '{"includeReverseDeps":true,"adoptNativeOnNameMatch":false}'
```

## Execute / preview options

Applied at **preview or execute time** (request body `options`, merged over `plan.options`). Lets one committed plan behave differently per destination.

| Option                    | Description |
| ------------------------- | ----------- |
| `exclude`                 | Blacklist: skip named entities by type; cascade-blocks dependents |
| `entityPolicies.<type>.onExist` | `update` (default) or `skip` — skip preserves dest content and keeps `idMap` for dependents |
| `adoptNativeOnNameMatch`  | Overrides the plan-time value for this run |

Example — skip customized downstream parameters, sync everything else:

```json
{
  "entityPolicies": {
    "parameter": { "onExist": "skip" }
  }
}
```

Example — exclude specific entities:

```json
{
  "exclude": {
    "parameter": { "names": ["ClientLocalSetting"] },
    "flow": { "names": ["InternalOnlyFlow"] }
  }
}
```

CLI:

```bash
entity-sync execute ... \
  --execute-options '{"entityPolicies":{"parameter":{"onExist":"skip"}}}'
```

Programmatic:

```js
await client.preview(destOrgId, plan, { entityPolicies: { parameter: { onExist: "skip" } } });
await client.execute(destOrgId, plan, { entityPolicies: { parameter: { onExist: "skip" } } });
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
  --plan-path .synatic/plans/plan.json \
  --execute-options '{"entityPolicies":{"parameter":{"onExist":"skip"}}}'
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
