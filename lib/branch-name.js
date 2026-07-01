/**
 * @returns {string}
 */
export function createBranchName() {
  return `entity-sync-plan-${new Date()
    .toISOString()
    .replaceAll(":", "-")
    .split(".")[0]}`;
}
