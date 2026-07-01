import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  readPlanFile,
  resolvePlanPath,
  validatePlan,
  writePlanFiles,
} from "../lib/fs.js";

const tempDirs = [];

afterEach(function () {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
  delete process.env.ENTITY_SYNC_WORKSPACE;
  delete process.env.GITHUB_WORKSPACE;
});

function createTempWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "entity-sync-"));
  tempDirs.push(dir);
  process.env.ENTITY_SYNC_WORKSPACE = dir;
  return dir;
}

describe("plan file helpers", function () {
  it("writes plan and manifest files", function () {
    const workspace = createTempWorkspace();
    const plan = {
      planId: "plan-1",
      sourceOrgId: "org-1",
      rootType: "flow",
      rootId: "507f1f77bcf86cd799439011",
      generatedAt: "2026-05-28T10:00:00.000Z",
      options: {},
      steps: [{ order: 1 }],
    };

    writePlanFiles(plan, ".synatic/plans/flow.json");

    const planPath = resolvePlanPath(".synatic/plans/flow.json");
    const manifestPath = resolvePlanPath(".synatic/plans/manifest.json");

    assert.equal(fs.existsSync(planPath), true);
    assert.equal(fs.existsSync(manifestPath), true);
    assert.equal(JSON.parse(fs.readFileSync(planPath, "utf8")).planId, "plan-1");
    assert.equal(
      JSON.parse(fs.readFileSync(manifestPath, "utf8")).planFile,
      ".synatic/plans/flow.json"
    );
    assert.ok(workspace);
  });

  it("writes roots into the manifest for multi-root plans", function () {
    createTempWorkspace();
    const plan = {
      planId: "plan-multi",
      sourceOrgId: "org-1",
      roots: [
        { rootType: "solution", rootId: "S1" },
        { rootType: "serviceView", rootId: "SV1" },
      ],
      generatedAt: "2026-05-28T10:00:00.000Z",
      options: {},
      steps: [{ order: 1 }],
    };

    writePlanFiles(plan, ".synatic/plans/bundle.json");

    const manifestPath = resolvePlanPath(".synatic/plans/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.roots.length, 2);
    assert.equal(manifest.rootType, undefined);
  });

  it("reads and validates a plan file", function () {
    createTempWorkspace();
    writePlanFiles(
      {
        planId: "plan-1",
        sourceOrgId: "org-1",
        rootType: "flow",
        rootId: "507f1f77bcf86cd799439011",
        generatedAt: "2026-05-28T10:00:00.000Z",
        options: {},
        steps: [],
      },
      ".synatic/plans/flow.json"
    );

    const loaded = readPlanFile(".synatic/plans/flow.json");
    assert.equal(loaded.planId, "plan-1");
  });

  it("throws when plan file is missing", function () {
    createTempWorkspace();
    assert.throws(
      () => readPlanFile(".synatic/plans/missing.json"),
      /Plan file not found/
    );
  });

  it("validates required plan fields", function () {
    assert.throws(() => validatePlan({}, "plan.json"), /planId is required/);
    assert.throws(() => validatePlan({ planId: "x" }, "plan.json"), /steps must be an array/);
  });
});
