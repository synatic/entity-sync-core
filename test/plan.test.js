import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EntitySyncApiClient } from "../lib/api-client.js";
import { runPlan } from "../lib/commands/plan.js";

describe("runPlan", function () {
  let workspace = null;

  beforeEach(function () {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "entity-sync-plan-"));
    process.env.ENTITY_SYNC_WORKSPACE = workspace;
  });

  afterEach(function () {
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
    delete process.env.ENTITY_SYNC_WORKSPACE;
  });

  it("writes plan files from API response", async function () {
    const plan = {
      planId: "plan-1",
      sourceOrgId: "org-1",
      rootType: "flow",
      rootId: "507f1f77bcf86cd799439011",
      generatedAt: "2026-05-28T10:00:00.000Z",
      options: {},
      steps: [{ order: 1 }],
    };

    const client = new EntitySyncApiClient({
      apiUrl: "https://api.example.com",
      apiKey: "syn_api_test",
    });
    client.plan = async () => plan;

    const result = await runPlan(
      {
        command: "plan",
        apiUrl: "https://api.example.com",
        apiKey: "syn_api_test",
        sourceOrgId: "org-1",
        rootType: "flow",
        rootId: "507f1f77bcf86cd799439011",
        planPath: ".synatic/plans/flow.json",
        planOptions: {},
      },
      { client }
    );

    assert.equal(result.plan.planId, "plan-1");
    assert.equal(result.writtenFiles.length, 2);
    assert.equal(fs.existsSync(result.planAbsolutePath), true);
  });
});
