import assert from "node:assert/strict";
import { formatApiError } from "../lib/api-errors.js";

describe("formatApiError", function () {
  it("includes request context and server error guidance for 500 responses", function () {
    const message = formatApiError(
      {
        statusCode: 500,
        body: {
          statusCode: 500,
          url: "/v1/organizations/development/entity-sync/plan",
          method: "POST",
          message: "Cannot read properties of undefined (reading 'length')",
          code: "internal_error",
          error: {},
        },
      },
      "Plan",
      {
        method: "POST",
        url: "https://api.us.synatic.dev/v1/organizations/development/entity-sync/plan",
        requestBody: {
          rootType: "flow",
          rootId: "611a1a0493eda02d8728b116",
          options: { includeReverseDeps: true },
        },
      }
    );

    assert.match(message, /Plan failed \(HTTP 500\)/);
    assert.match(
      message,
      /POST https:\/\/api.us.synatic.dev\/v1\/organizations\/development\/entity-sync\/plan/
    );
    assert.match(message, /"rootType":"flow"/);
    assert.match(message, /Cannot read properties of undefined/);
    assert.match(message, /Code: internal_error/);
    assert.match(message, /Response body:/);
    assert.match(message, /"statusCode":500/);
    assert.match(message, /server-side error from the Synatic API/);
  });

  it("includes raw response body even when message is a generic Internal server error", function () {
    const message = formatApiError(
      {
        statusCode: 500,
        body: {
          statusCode: 500,
          message: "Internal server error",
          error: {
            name: "TypeError",
            message: "Cannot read properties of null (reading '_id')",
          },
        },
      },
      "Preview",
      {
        method: "POST",
        url: "https://api.example.com/v1/organizations/acme/entity-sync/preview",
        requestBody: { planId: "plan-1", stepCount: 193 },
      }
    );

    assert.match(message, /Preview failed \(HTTP 500\)/);
    assert.match(message, /Message: Internal server error/);
    assert.match(message, /Details:.*"Cannot read properties of null/);
    assert.match(message, /Response body:.*"Internal server error"/);
  });

  it("adds auth guidance for 403 responses", function () {
    const message = formatApiError(
      {
        statusCode: 403,
        body: {
          message: "Forbidden",
        },
      },
      "Plan",
      {
        method: "POST",
        url: "https://api.example.com/v1/organizations/acme/entity-sync/plan",
      }
    );

    assert.match(message, /Check that the API key is valid/);
  });
});
