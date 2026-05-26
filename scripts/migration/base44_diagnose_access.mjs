#!/usr/bin/env node
/**
 * Read-only Base44 access diagnostic.
 *
 * This script checks whether the configured Base44 app ID and access token can
 * reach the Base44 API. It does not export, create, update, or delete data.
 */

import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const apiBaseUrl = trimTrailingSlash(args["api-base-url"] || process.env.BASE44_API_BASE_URL);
const appId = args["app-id"] || process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
const token = args["access-token"] || process.env.BASE44_ACCESS_TOKEN;

const checks = [];

main().catch((error) => {
  console.error("Unexpected diagnostic failure:", error?.message || String(error));
  process.exit(1);
});

async function main() {
  printHeader();

  const configOk = validateConfig();
  if (!configOk) {
    printUsage();
    process.exit(1);
  }

  console.log("Configuration:");
  console.log(`  BASE44_API_BASE_URL: ${apiBaseUrl}`);
  console.log(`  BASE44_APP_ID: ${appId}`);
  console.log(`  BASE44_ACCESS_TOKEN: ${maskToken(token)}`);
  console.log("");

  await runCheck("Base API reachable", `${apiBaseUrl}/api`, {
    headers: baseHeaders(),
  });

  await runCheck("Public app settings by ID", `${apiBaseUrl}/api/apps/public/prod/public-settings/by-id/${encodeURIComponent(appId)}`, {
    headers: baseHeaders(),
  });

  await runCheck("Authenticated user for app", `${apiBaseUrl}/api/apps/${encodeURIComponent(appId)}/entities/User/me`, {
    headers: authHeaders(),
  });

  await runCheck("Entity list smoke test", `${apiBaseUrl}/api/apps/${encodeURIComponent(appId)}/entities/User?limit=1`, {
    headers: authHeaders(),
  });

  await runOptionalAppListChecks();

  printSummary();
}

function printHeader() {
  console.log("Base44 access diagnostic");
  console.log("Mode: read-only, no export, no data modification");
  console.log("");
}

function validateConfig() {
  let ok = true;

  if (!apiBaseUrl) {
    ok = false;
    console.error("Missing token-independent config: BASE44_API_BASE_URL or --api-base-url is required.");
  } else {
    try {
      const parsed = new URL(apiBaseUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        ok = false;
        console.error("Invalid BASE44_API_BASE_URL: must start with http:// or https://");
      }
    } catch {
      ok = false;
      console.error(`Invalid BASE44_API_BASE_URL: ${apiBaseUrl}`);
    }
  }

  if (!appId) {
    ok = false;
    console.error("Missing app config: BASE44_APP_ID, VITE_BASE44_APP_ID, or --app-id is required.");
  }

  if (!token) {
    ok = false;
    console.error("Missing token: BASE44_ACCESS_TOKEN or --access-token is required.");
  }

  return ok;
}

async function runCheck(label, url, options = {}) {
  console.log(`Checking: ${label}`);
  console.log(`  URL: ${url}`);

  const result = {
    label,
    url,
    ok: false,
    status: null,
    classification: null,
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: options.headers || {},
    });

    result.status = response.status;
    const bodyText = await response.text();
    result.classification = classifyResponse(response.status, bodyText, label);
    result.ok = response.ok;

    console.log(`  HTTP status: ${response.status}`);
    console.log(`  Result: ${result.classification}`);
    printSafeBodyHint(bodyText);
  } catch (error) {
    result.classification = classifyNetworkError(error);
    console.log(`  Result: ${result.classification}`);
  }

  checks.push(result);
  console.log("");
}

async function runOptionalAppListChecks() {
  const candidates = [
    `${apiBaseUrl}/api/apps`,
    `${apiBaseUrl}/api/apps/public`,
    `${apiBaseUrl}/api/workspaces`,
  ];

  for (const url of candidates) {
    await runCheck("Optional available apps/workspaces probe", url, {
      headers: authHeaders(),
    });
  }
}

function classifyResponse(status, bodyText, label) {
  const lowerBody = bodyText.toLowerCase();

  if (status >= 200 && status < 300) {
    if (label.includes("Optional available apps/workspaces")) {
      return "optional endpoint supported or reachable";
    }
    return "success";
  }

  if (status === 400) {
    return "bad request; endpoint may require a different Base44 parameter format";
  }

  if (status === 401) {
    if (lowerBody.includes("expired")) {
      return "token expired; get a fresh Base44 access token from the logged-in browser session";
    }
    return "missing, invalid, or expired token";
  }

  if (status === 403) {
    return "token is valid but app/entity is not accessible to this user";
  }

  if (status === 404) {
    if (lowerBody.includes("app not found")) {
      return "wrong app ID or token belongs to a different Base44 app/account";
    }
    return "endpoint not found or export/list endpoint unsupported";
  }

  if (status === 405) {
    return "endpoint exists but does not support this method";
  }

  if (status >= 500) {
    return "Base44 server error or temporary outage";
  }

  return "unexpected response; review status with Base44 support if it repeats";
}

function classifyNetworkError(error) {
  const message = error?.message || String(error);
  if (message.includes("Invalid URL")) {
    return "invalid API base URL";
  }
  if (message.includes("fetch failed")) {
    return "network or DNS failure reaching Base44 API";
  }
  return `network/client error: ${message}`;
}

function printSafeBodyHint(bodyText) {
  if (!bodyText) {
    console.log("  Body hint: empty");
    return;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === "object") {
    const safe = {
      message: parsed.message || parsed.error || parsed.detail || undefined,
      code: parsed.code || parsed.error_code || undefined,
      reason: parsed.reason || parsed.extra_data?.reason || undefined,
    };
    console.log(`  Body hint: ${JSON.stringify(removeUndefined(safe))}`);
    return;
  }

  console.log(`  Body hint: ${bodyText.slice(0, 180).replace(/\s+/g, " ")}`);
}

function printSummary() {
  const failures = checks.filter((check) => !check.ok);
  console.log("Diagnostic summary:");
  console.log(`  checks_run: ${checks.length}`);
  console.log(`  failed_checks: ${failures.length}`);

  const appNotFound = checks.some((check) => check.classification?.includes("wrong app ID"));
  const tokenProblem = checks.some((check) => check.classification?.includes("token"));
  const forbidden = checks.some((check) => check.status === 403);
  const success = checks.some((check) => check.ok && check.label === "Authenticated user for app");

  if (success) {
    console.log("  next_step: token can access this app; retry the read-only export.");
    return;
  }

  if (appNotFound) {
    console.log("  next_step: confirm the live Base44 app_id from the original Base44 app URL or localStorage, then rerun this diagnostic.");
    return;
  }

  if (tokenProblem) {
    console.log("  next_step: get a fresh Base44 access token from the logged-in Base44 browser session and rerun this diagnostic.");
    return;
  }

  if (forbidden) {
    console.log("  next_step: log in as the Base44 app owner/admin or ask Base44 support for a full export.");
    return;
  }

  console.log("  next_step: if app ID and token are correct, external export may be unsupported; use Base44 support/UI/Google Drive backup fallback.");
}

function printUsage() {
  console.error(`
Usage:
  BASE44_API_BASE_URL=https://base44.app \
  BASE44_APP_ID=your-base44-app-id \
  BASE44_ACCESS_TOKEN=your-current-base44-access-token \
  node scripts/migration/base44_diagnose_access.mjs

Alternative:
  node scripts/migration/base44_diagnose_access.mjs \
    --api-base-url https://base44.app \
    --app-id your-base44-app-id \
    --access-token your-current-base44-access-token

This diagnostic is read-only. It never prints the token and never exports data.
`);
}

function baseHeaders() {
  return {
    Accept: "application/json",
    "X-App-Id": String(appId || ""),
  };
}

function authHeaders() {
  return {
    ...baseHeaders(),
    Authorization: `Bearer ${token}`,
  };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const value = argv[index + 1]?.startsWith("--") ? "true" : argv[index + 1] || "true";
    parsed[key] = value;
    if (value !== "true") {
      index += 1;
    }
  }
  return parsed;
}

function trimTrailingSlash(value) {
  if (!value) {
    return value;
  }
  return value.replace(/\/+$/, "");
}

function maskToken(value) {
  if (!value) {
    return "missing";
  }
  if (value.length <= 10) {
    return "***";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)} (${value.length} chars)`;
}

function removeUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
