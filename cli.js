#!/usr/bin/env node
import { parseConfig } from "./lib/config.js";
import { runPlan } from "./lib/commands/plan.js";
import { runExecute } from "./lib/commands/execute.js";

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = next;
    i++;
  }
  return result;
}

/**
 * @param {Record<string, string>} args
 * @returns {Record<string, unknown>}
 */
function toConfigValues(args) {
  return {
    apiUrl: args["api-url"],
    apiKey: args["api-key"],
    sourceOrgId: args["source-org-id"],
    rootType: args["root-type"],
    rootId: args["root-id"],
    roots: args.roots,
    planPath: args["plan-path"],
    planOptions: args["plan-options"],
    destOrgId: args["dest-org-id"],
    previewFirst: args["preview-first"],
    previewOnly: args["preview-only"],
    failOnConflict: args["fail-on-conflict"],
  };
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (!command || (command !== "plan" && command !== "execute")) {
    console.error("Usage: entity-sync <plan|execute> [options]");
    console.error("");
    console.error("Plan options:");
    console.error("  --api-url --api-key --source-org-id");
    console.error("  --root-type --root-id  OR  --roots '<json array>'");
    console.error("  --plan-path --plan-options");
    console.error("");
    console.error("Execute options:");
    console.error("  --api-url --api-key --dest-org-id --plan-path");
    console.error("  --preview-first --preview-only --fail-on-conflict");
    process.exit(1);
  }

  const args = parseArgs(rest);
  const config = parseConfig(command, toConfigValues(args));

  if (command === "plan") {
    const result = await runPlan(config);
    console.log(JSON.stringify({ planId: result.plan.planId, planPath: result.planPath }));
    return;
  }

  const result = await runExecute(config);
  console.log(
    JSON.stringify({
      planId: result.planId,
      runId: result.runId,
      conflicts: result.conflicts,
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
