/**
 * @typedef {Object} EntitySyncRoot
 * @property {string} rootType
 * @property {string} rootId
 */

/**
 * @typedef {Object} SyncConfig
 * @property {'plan' | 'execute'} command
 * @property {string} apiUrl
 * @property {string} apiKey
 * @property {string} planPath
 * @property {string} [sourceOrgId]
 * @property {string} [rootType]
 * @property {string} [rootId]
 * @property {EntitySyncRoot[]} [roots]
 * @property {Record<string, unknown>} [planOptions]
 * @property {string} [destOrgId]
 * @property {boolean} [previewFirst]
 * @property {boolean} [previewOnly]
 * @property {boolean} [failOnConflict]
 */

/**
 * @typedef {Object} SyncPlan
 * @property {string} planId
 * @property {string} sourceOrgId
 * @property {string} [rootType]
 * @property {string} [rootId]
 * @property {EntitySyncRoot[]} [roots]
 * @property {string} generatedAt
 * @property {Record<string, unknown>} options
 * @property {Array<Record<string, unknown>>} steps
 */

/**
 * @typedef {Object} SyncLogger
 * @property {(message: string) => void} info
 * @property {(message: string) => void} warning
 * @property {(name: string) => void} startGroup
 * @property {() => void} endGroup
 */

/**
 * @typedef {Object} PlanFileRef
 * @property {string} absolutePath
 * @property {string} repoPath
 */

/**
 * @typedef {Object} RunPlanResult
 * @property {SyncPlan} plan
 * @property {string} planPath
 * @property {string} planAbsolutePath
 * @property {string} manifestAbsolutePath
 * @property {PlanFileRef[]} writtenFiles
 */

/**
 * @typedef {Object} RunExecuteResult
 * @property {string} planId
 * @property {string} planPath
 * @property {Record<string, unknown>} [preview]
 * @property {Record<string, unknown>} [execute]
 * @property {string} [runId]
 * @property {Record<string, unknown>} [run]
 * @property {number} [conflicts]
 */

export {};
