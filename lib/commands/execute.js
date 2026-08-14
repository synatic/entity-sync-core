import { EntitySyncApiClient } from "../api-client.js";
import { readPlanFile } from "../fs.js";

/**
 * @param {Record<string, unknown> | undefined} summary
 * @returns {number}
 */
function getConflictCount(summary) {
  if (!summary || typeof summary !== "object") {
    return 0;
  }
  const value = summary.toConflict;
  return typeof value === "number" ? value : 0;
}

/**
 * @param {Record<string, unknown> | undefined} summary
 * @returns {number}
 */
function getFailedCount(summary) {
  if (!summary || typeof summary !== "object") {
    return 0;
  }
  const value = summary.failed;
  return typeof value === "number" ? value : 0;
}

/**
 * @param {Record<string, unknown>} preview
 * @param {import('../types.js').SyncLogger} logger
 */
function logPreviewSummary(preview, logger) {
  const summary = preview.summary;
  logger.info(`Preview summary: ${JSON.stringify(summary)}`);

  const actions = preview.actions;
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (action && typeof action === "object") {
        const record = /** @type {Record<string, unknown>} */ (action);
        logger.info(
          `  [${record.order}] ${record.entityType} ${record.sourceName}: ${record.action}`
        );
      }
    }
  }

  const warnings = preview.warnings;
  if (Array.isArray(warnings) && warnings.length > 0) {
    logger.warning(`Preview warnings (${warnings.length}):`);
    for (const warning of warnings) {
      logger.warning(JSON.stringify(warning));
    }
  }
}

/**
 * @param {Record<string, unknown>} run
 * @param {import('../types.js').SyncLogger} logger
 */
function logRunAudit(run, logger) {
  logger.info(`Run status: ${run.status}`);
  const steps = run.steps;
  if (!Array.isArray(steps)) {
    return;
  }

  for (const step of steps) {
    if (!step || typeof step !== "object") {
      continue;
    }
    const record = /** @type {Record<string, unknown>} */ (step);
    const line = `[${record.order}] ${record.entityType} ${record.sourceName}: ${record.outcome}`;
    if (record.error) {
      logger.warning(`${line} — ${record.error}`);
    } else if (record.conflictReason) {
      logger.warning(`${line} — ${record.conflictReason}`);
    } else {
      logger.info(line);
    }
  }
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
      // no-op
    },
  };
}

/**
 * @param {import('../types.js').SyncConfig} config
 * @param {{ client?: EntitySyncApiClient, logger?: import('../types.js').SyncLogger }} [options]
 * @returns {Promise<import('../types.js').RunExecuteResult>}
 */
export async function runExecute(config, options = {}) {
  const logger = options.logger || createConsoleLogger();
  const client =
    options.client ||
    new EntitySyncApiClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
    });

  const plan = readPlanFile(config.planPath);

  logger.info(
    `Loaded plan ${plan.planId} with ${plan.steps.length} steps from ${config.planPath}`
  );

  /** @type {import('../types.js').RunExecuteResult} */
  const result = {
    planId: plan.planId,
    planPath: config.planPath,
  };

  if (config.previewFirst) {
    logger.startGroup("Preview");
    const previewResult = await client.preview(
      config.destOrgId,
      plan,
      config.executeOptions
    );
    logPreviewSummary(previewResult, logger);

    const conflicts = getConflictCount(
      /** @type {Record<string, unknown>} */ (previewResult.summary)
    );
    result.preview = previewResult;
    result.conflicts = conflicts;
    logger.endGroup();

    if (config.failOnConflict && conflicts > 0) {
      throw new Error(
        `Preview reported ${conflicts} conflict(s). Resolve conflicts before executing.`
      );
    }
  }

  if (config.previewOnly) {
    logger.info("preview-only is true; skipping execute");
    return result;
  }

  logger.startGroup("Execute");
  const executeResult = await client.execute(
    config.destOrgId,
    plan,
    config.executeOptions
  );
  const runId = String(executeResult.runId || "");
  result.execute = executeResult;
  result.runId = runId;
  logger.info(`Execute summary: ${JSON.stringify(executeResult.summary ?? {})}`);
  logger.endGroup();

  if (runId) {
    logger.startGroup("Run audit");
    const run = await client.getRun(config.destOrgId, runId);
    logRunAudit(run, logger);
    result.run = run;
    logger.endGroup();

    const failed = getFailedCount(
      /** @type {Record<string, unknown>} */ (executeResult.summary)
    );
    const status = String(run.status || "");

    if (failed > 0) {
      throw new Error(`Execute completed with ${failed} failed step(s)`);
    }

    if (status === "completed_with_errors") {
      throw new Error("Sync run completed with errors");
    }
  }

  return result;
}
