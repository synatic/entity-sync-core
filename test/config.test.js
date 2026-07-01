import assert from "node:assert/strict";
import {
  parseConfig,
  parsePlanOptions,
  parseRoots,
} from "../lib/config.js";

describe("parseRoots", function () {
  it("parses a valid roots array", function () {
    assert.deepEqual(
      parseRoots(
        '[{"rootType":"solution","rootId":"67cee4ac1c53a7be24dc77b7"},{"rootType":"serviceView","rootId":"abc"}]'
      ),
      [
        { rootType: "solution", rootId: "67cee4ac1c53a7be24dc77b7" },
        { rootType: "serviceView", rootId: "abc" },
      ]
    );
  });

  it("throws for invalid JSON", function () {
    assert.throws(() => parseRoots("{invalid"), /Invalid roots JSON/);
  });

  it("throws for empty array", function () {
    assert.throws(() => parseRoots("[]"), /non-empty JSON array/);
  });

  it("throws for duplicate roots", function () {
    assert.throws(
      () =>
        parseRoots(
          '[{"rootType":"parameter","rootId":"P1"},{"rootType":"parameter","rootId":"P1"}]'
        ),
      /duplicate root/
    );
  });
});

describe("parsePlanOptions", function () {
  it("parses a valid JSON object", function () {
    assert.deepEqual(parsePlanOptions('{"includeTriggers": true}'), {
      includeTriggers: true,
    });
  });

  it("throws for invalid JSON", function () {
    assert.throws(() => parsePlanOptions("{invalid"), /Invalid plan-options JSON/);
  });

  it("throws for non-object values", function () {
    assert.throws(() => parsePlanOptions("[]"), /must be a JSON object/);
  });
});

describe("parseConfig", function () {
  it("parses plan command inputs", function () {
    const config = parseConfig("plan", {
      apiUrl: "https://api.example.com/",
      apiKey: "syn_api_test",
      sourceOrgId: "60ff27eab96f22106d98f1f2",
      rootType: "flow",
      rootId: "507f1f77bcf86cd799439011",
      planPath: ".synatic/plans/flow.json",
      planOptions: '{"includeReverseDeps": true}',
    });

    assert.equal(config.command, "plan");
    assert.equal(config.apiUrl, "https://api.example.com");
    assert.equal(config.sourceOrgId, "60ff27eab96f22106d98f1f2");
    assert.deepEqual(config.planOptions, { includeReverseDeps: true });
  });

  it("parses plan command inputs with roots", function () {
    const config = parseConfig("plan", {
      apiUrl: "https://api.example.com",
      apiKey: "syn_api_test",
      sourceOrgId: "60ff27eab96f22106d98f1f2",
      roots: '[{"rootType":"solution","rootId":"S1"},{"rootType":"serviceView","rootId":"SV1"}]',
      planPath: ".synatic/plans/bundle.json",
    });

    assert.deepEqual(config.roots, [
      { rootType: "solution", rootId: "S1" },
      { rootType: "serviceView", rootId: "SV1" },
    ]);
    assert.equal(config.rootType, undefined);
  });

  it("rejects roots together with rootType", function () {
    assert.throws(
      () =>
        parseConfig("plan", {
          apiUrl: "https://api.example.com",
          apiKey: "syn_api_test",
          sourceOrgId: "60ff27eab96f22106d98f1f2",
          roots: '[{"rootType":"flow","rootId":"F1"}]',
          rootType: "flow",
          rootId: "F1",
        }),
      /not both/
    );
  });

  it("parses execute command inputs with defaults", function () {
    const config = parseConfig("execute", {
      apiUrl: "https://api.example.com",
      apiKey: "syn_api_test",
      destOrgId: "507f1f77bcf86cd799439012",
      planPath: ".synatic/plans/flow.json",
    });

    assert.equal(config.command, "execute");
    assert.equal(config.destOrgId, "507f1f77bcf86cd799439012");
    assert.equal(config.previewFirst, true);
    assert.equal(config.previewOnly, false);
    assert.equal(config.failOnConflict, true);
  });

  it("rejects invalid command", function () {
    assert.throws(() => parseConfig("sync", {}), /Invalid command/);
  });

  it("rejects invalid root type", function () {
    assert.throws(
      () =>
        parseConfig("plan", {
          apiUrl: "https://api.example.com",
          apiKey: "syn_api_test",
          sourceOrgId: "60ff27eab96f22106d98f1f2",
          rootType: "invalid",
          rootId: "507f1f77bcf86cd799439011",
        }),
      /Invalid rootType/
    );
  });
});
