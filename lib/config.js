const ROOT_TYPES = new Set([
  "flow",
  "solution",
  "buffer",
  "dataStore",
  "parameter",
  "relay",
  "userGroup",
  "serviceView",
  "flowTrigger",
]);

/**
 * @param {string} raw
 * @returns {import('./types.js').EntitySyncRoot[]}
 */
export function parseRoots(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid roots JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("roots must be a non-empty JSON array");
  }

  const seen = new Set();
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`roots[${index}] must be an object`);
    }
    const rootType = typeof entry.rootType === "string" ? entry.rootType.trim() : "";
    const rootId = typeof entry.rootId === "string" ? entry.rootId.trim() : "";
    if (!ROOT_TYPES.has(rootType)) {
      throw new Error(
        `Invalid rootType '${entry.rootType}' in roots[${index}]. Must be one of: ${[...ROOT_TYPES].join(", ")}`
      );
    }
    if (!rootId) {
      throw new Error(`roots[${index}].rootId is required`);
    }
    const key = `${rootType}:${rootId}`;
    if (seen.has(key)) {
      throw new Error(`duplicate root in roots: ${key}`);
    }
    seen.add(key);
    return { rootType, rootId };
  });
}

/**
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
export function parsePlanOptions(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("plan-options must be a JSON object");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Invalid plan-options JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

/**
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
export function parseExecuteOptions(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("execute-options must be a JSON object");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Invalid execute-options JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

/**
 * @param {unknown} value
 * @param {boolean} [defaultValue=false]
 * @returns {boolean}
 */
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return String(value).toLowerCase() === "true";
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isTruthyDefaultTrue(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  return String(value).toLowerCase() === "true";
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} values
 * @param {{ required?: boolean, defaultValue?: string }} [options]
 * @returns {string}
 */
function getStringValue(name, values, options = {}) {
  const raw = values[name];
  const value =
    raw === undefined || raw === null ? options.defaultValue || "" : String(raw).trim();
  if (options.required && !value) {
    throw new Error(`'${name}' is required`);
  }
  return value;
}

/**
 * @param {string} command
 * @param {Record<string, unknown>} values
 * @returns {import('./types.js').SyncConfig}
 */
export function parseConfig(command, values) {
  const normalizedCommand = command.toLowerCase();
  if (normalizedCommand !== "plan" && normalizedCommand !== "execute") {
    throw new Error(`Invalid command '${command}'. Must be 'plan' or 'execute'.`);
  }

  const apiUrl = getStringValue("apiUrl", values, { required: true }).replace(/\/+$/, "");
  const apiKey = getStringValue("apiKey", values, { required: true });
  const planPath =
    getStringValue("planPath", values) || ".synatic/plans/plan.json";

  /** @type {import('./types.js').SyncConfig} */
  const config = {
    command: normalizedCommand,
    apiUrl,
    apiKey,
    planPath,
  };

  if (normalizedCommand === "plan") {
    config.sourceOrgId = getStringValue("sourceOrgId", values, { required: true });
    const rootsRaw = getStringValue("roots", values);
    const rootTypeRaw = getStringValue("rootType", values);
    const rootIdRaw = getStringValue("rootId", values);

    if (rootsRaw) {
      if (rootTypeRaw || rootIdRaw) {
        throw new Error(
          "Provide either 'roots' or 'rootType' + 'rootId', not both"
        );
      }
      config.roots = parseRoots(rootsRaw);
    } else {
      config.rootType = getStringValue("rootType", values, { required: true });
      config.rootId = getStringValue("rootId", values, { required: true });

      if (!ROOT_TYPES.has(config.rootType)) {
        throw new Error(
          `Invalid rootType '${config.rootType}'. Must be one of: ${[...ROOT_TYPES].join(", ")}`
        );
      }
    }

    config.planOptions = parsePlanOptions(
      getStringValue("planOptions", values) || "{}"
    );
  }

  if (normalizedCommand === "execute") {
    config.destOrgId = getStringValue("destOrgId", values, { required: true });
    config.previewFirst = isTruthyDefaultTrue(values.previewFirst);
    config.previewOnly = parseBoolean(values.previewOnly, false);
    config.failOnConflict = isTruthyDefaultTrue(values.failOnConflict);
    const executeOptionsRaw = getStringValue("executeOptions", values);
    if (executeOptionsRaw) {
      config.executeOptions = parseExecuteOptions(executeOptionsRaw);
    }
  }

  return config;
}

/**
 * Maps kebab-case action input names to camelCase config keys.
 * @param {Record<string, string>} inputs
 * @returns {Record<string, unknown>}
 */
export function mapActionInputs(inputs) {
  return {
    apiUrl: inputs["api-url"],
    apiKey: inputs["api-key"],
    sourceOrgId: inputs["source-org-id"],
    rootType: inputs["root-type"],
    rootId: inputs["root-id"],
    roots: inputs.roots,
    planPath: inputs["plan-path"],
    planOptions: inputs["plan-options"],
    destOrgId: inputs["dest-org-id"],
    previewFirst: inputs["preview-first"],
    previewOnly: inputs["preview-only"],
    failOnConflict: inputs["fail-on-conflict"],
    executeOptions: inputs["execute-options"],
  };
}
