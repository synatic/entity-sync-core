import assert from "node:assert/strict";
import { EntitySyncApiClient } from "../lib/api-client.js";

/**
 * @param {Record<string, Function>} responses
 */
function createMockClient(responses) {
  const post = async (url, options) => {
    const key = `POST ${url}`;
    const handler = responses[key];
    if (!handler) {
      throw new Error(`Unexpected POST ${url}`);
    }
    return handler(options);
  };

  const get = async (url) => {
    const key = `GET ${url}`;
    const handler = responses[key];
    if (!handler) {
      throw new Error(`Unexpected GET ${url}`);
    }
    return handler();
  };

  const client = new EntitySyncApiClient({
    apiUrl: "https://api.example.com",
    apiKey: "syn_api_test",
  });

  client.client = { post, get };
  return { client, post, get };
}

describe("EntitySyncApiClient", function () {
  it("calls plan against the source org", async function () {
    const plan = {
      planId: "plan-1",
      sourceOrgId: "org-1",
      rootType: "flow",
      rootId: "507f1f77bcf86cd799439011",
      generatedAt: "2026-05-28T10:00:00.000Z",
      options: {},
      steps: [],
    };

    const { client, post } = createMockClient({
      "POST https://api.example.com/v1/organizations/acme-uat/entity-sync/plan":
        async (options) => ({
          statusCode: 200,
          body: plan,
          request: { options },
        }),
    });

    const result = await client.plan("acme-uat", {
      rootType: "flow",
      rootId: "507f1f77bcf86cd799439011",
      options: {},
    });

    assert.equal(result.planId, "plan-1");
    assert.ok(post);
  });

  it("calls plan with a roots array", async function () {
    const plan = {
      planId: "plan-multi",
      sourceOrgId: "org-1",
      roots: [
        { rootType: "parameter", rootId: "P1" },
        { rootType: "parameter", rootId: "P2" },
      ],
      generatedAt: "2026-05-28T10:00:00.000Z",
      options: {},
      steps: [],
    };

    let capturedBody = null;
    const { client } = createMockClient({
      "POST https://api.example.com/v1/organizations/acme-uat/entity-sync/plan":
        async (options) => {
          capturedBody = options.json;
          return {
            statusCode: 200,
            body: plan,
          };
        },
    });

    const result = await client.plan("acme-uat", {
      roots: [
        { rootType: "parameter", rootId: "P1" },
        { rootType: "parameter", rootId: "P2" },
      ],
      options: {},
    });

    assert.equal(result.roots.length, 2);
    assert.equal(capturedBody.roots.length, 2);
  });

  it("sends execute options on preview and execute", async function () {
    const plan = {
      planId: "plan-1",
      steps: [{ order: 0, entityType: "parameter", sourceId: "P1" }],
    };
    const options = { entityPolicies: { parameter: { onExist: "skip" } } };
    let previewBody = null;
    let executeBody = null;

    const { client } = createMockClient({
      "POST https://api.example.com/v1/organizations/acme-prod/entity-sync/preview":
        async (req) => {
          previewBody = req.json;
          return { statusCode: 200, body: { summary: {}, actions: [] } };
        },
      "POST https://api.example.com/v1/organizations/acme-prod/entity-sync/execute":
        async (req) => {
          executeBody = req.json;
          return { statusCode: 200, body: { runId: "run-1", summary: {} } };
        },
    });

    await client.preview("acme-prod", plan, options);
    await client.execute("acme-prod", plan, options);

    assert.deepEqual(previewBody.options, options);
    assert.deepEqual(executeBody.options, options);
  });

  it("throws a readable error for failed preview", async function () {
    const { client } = createMockClient({
      "POST https://api.example.com/v1/organizations/acme-prod/entity-sync/preview":
        async () => ({
          statusCode: 400,
          body: {
            message: "plan.planId is required",
            code: "bad_request",
          },
        }),
    });

    await assert.rejects(
      () =>
        client.preview("acme-prod", {
          planId: "",
          steps: [],
        }),
      /Preview failed \(HTTP 400\)/
    );
  });

  it("fetches run audit details", async function () {
    const { client } = createMockClient({
      "GET https://api.example.com/v1/organizations/acme-prod/entity-sync/runs/run-1":
        async () => ({
          statusCode: 200,
          body: {
            runId: "run-1",
            status: "completed",
            steps: [],
          },
        }),
    });

    const run = await client.getRun("acme-prod", "run-1");
    assert.equal(run.status, "completed");
  });
});
