import { EntitySyncApiClient } from "../api-client.js";
import {
  getWorkspaceRoot,
  repoPathFromAbsolute,
  toRepoRelativePath,
  writePlanFiles,
} from "../fs.js";

/**
 * @param {import('../types.js').SyncConfig} config
 * @param {{ client?: EntitySyncApiClient, logger?: import('../types.js').SyncLogger }} [options]
 * @returns {Promise<import('../types.js').RunPlanResult>}
 */
export async function runPlan(config, options = {}) {
  const logger = options.logger || createConsoleLogger();
  const client =
    options.client ||
    new EntitySyncApiClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
    });

  logger.info(
    config.roots
      ? `Generating plan for ${config.roots.length} roots in org ${config.sourceOrgId}`
      : `Generating plan for ${config.rootType} ${config.rootId} in org ${config.sourceOrgId}`
  );

  /** @type {{ roots?: import('../types.js').EntitySyncRoot[], rootType?: string, rootId?: string, options?: Record<string, unknown> }} */
  const requestBody = {
    options: config.planOptions || {},
  };
  if (config.roots) {
    requestBody.roots = config.roots;
  } else {
    requestBody.rootType = config.rootType;
    requestBody.rootId = config.rootId;
  }

  logger.info(
    `POST ${config.apiUrl}/v1/organizations/${config.sourceOrgId}/entity-sync/plan`
  );
  logger.info(`Request body: ${JSON.stringify(requestBody)}`);

  const plan = await client.plan(config.sourceOrgId, requestBody);

  const { planAbsolutePath, manifestAbsolutePath } = writePlanFiles(
    plan,
    config.planPath
  );

  logger.info(`Plan ${plan.planId} written to ${config.planPath}`);

  const workspaceRoot = getWorkspaceRoot();

  return {
    plan,
    planPath: config.planPath,
    planAbsolutePath,
    manifestAbsolutePath,
    writtenFiles: [
      {
        absolutePath: planAbsolutePath,
        repoPath: toRepoRelativePath(planAbsolutePath, workspaceRoot),
      },
      {
        absolutePath: manifestAbsolutePath,
        repoPath: repoPathFromAbsolute(workspaceRoot, manifestAbsolutePath),
      },
    ],
  };
}

/**
 * @returns {import('../types.js').SyncLogger}
 */
function createConsoleLogger() {
  return {
    info(message) {
      console.log(message);
    },
    warning(message) {
      console.warn(message);
    },
    startGroup(name) {
      console.log(`--- ${name} ---`);
    },
    endGroup() {
      // no-op for console
    },
  };
}
