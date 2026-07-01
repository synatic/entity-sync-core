import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EntitySyncApiClient } from "../lib/api-client.js";
import { runExecute } from "../lib/commands/execute.js";
import { writePlanFiles } from "../lib/fs.js";

describe("runExecute", function () {
  let workspace = null;

  beforeEach(function () {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "entity-sync-exec-"));
    process.env.ENTITY_SYNC_WORKSPACE = workspace;

    writePlanFiles(
      {
        planId: "plan-1",
        sourceOrgId: "org-1",
        rootType: "flow",
        rootId: "507f1f77bcf86cd799439011",
        generatedAt: "2026-05-28T10:00:00.000Z",
        options: {},
        steps: [{ order: 1 }],
      },
      ".synatic/plans/flow.json"
    );
  });

  afterEach(function () {
    if (workspace) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
    delete process.env.ENTITY_SYNC_WORKSPACE;
  });

  it("fails when preview reports conflicts and fail-on-conflict is true", async function () {
    const client = new EntitySyncApiClient({
      apiUrl: "https://api.example.com",
      apiKey: "syn_api_test",
    });
    client.preview = async () => ({
      planId: "plan-1",
      summary: { total: 2, toConflict: 1 },
      actions: [],
      warnings: [],
    });

    await assert.rejects(
      () =>
        runExecute(
          {
            command: "execute",
            apiUrl: "https://api.example.com",
            apiKey: "syn_api_test",
            planPath: ".synatic/plans/flow.json",
            destOrgId: "507f1f77bcf86cd799439012",
            previewFirst: true,
            previewOnly: false,
            failOnConflict: true,
          },
          { client }
        ),
      /1 conflict/
    );
  });

  it("stops after preview when preview-only is true", async function () {
    let previewCalled = false;
    let executeCalled = false;

    const client = new EntitySyncApiClient({
      apiUrl: "https://api.example.com",
      apiKey: "syn_api_test",
    });
    client.preview = async () => {
      previewCalled = true;
      return {
        planId: "plan-1",
        summary: { total: 1, toConflict: 0 },
        actions: [],
        warnings: [],
      };
    };
    client.execute = async () => {
      executeCalled = true;
      return { runId: "run-1", summary: {} };
    };

    await runExecute(
      {
        command: "execute",
        apiUrl: "https://api.example.com",
        apiKey: "syn_api_test",
        planPath: ".synatic/plans/flow.json",
        destOrgId: "507f1f77bcf86cd799439012",
        previewFirst: true,
        previewOnly: true,
        failOnConflict: true,
      },
      { client }
    );

    assert.equal(previewCalled, true);
    assert.equal(executeCalled, false);
  });
});
