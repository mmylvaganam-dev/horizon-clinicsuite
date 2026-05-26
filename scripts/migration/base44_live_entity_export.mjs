#!/usr/bin/env node
/**
 * Read-only Base44 entity exporter.
 *
 * This script exports Base44 entity records into JSON files. It does not create,
 * update, delete, or import any data.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@base44/sdk";

const args = parseArgs(process.argv.slice(2));
const checklistPath = args["checklist"];
const outputDir = args["output-dir"] || "Base44-Final-Backup/01_raw_entity_exports";
const limit = Number(args.limit || "100000");
const apiBaseUrl = args["api-base-url"] || process.env.BASE44_API_BASE_URL;
const appId = args["app-id"] || process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
const token = args["access-token"] || process.env.BASE44_ACCESS_TOKEN;

if (!checklistPath) {
  exitWithUsage("Missing --checklist");
}

if (!apiBaseUrl) {
  exitWithUsage("Missing BASE44_API_BASE_URL or --api-base-url. Example: https://base44.app");
}

validateUrl("BASE44_API_BASE_URL", apiBaseUrl);

if (!appId) {
  exitWithUsage("Missing BASE44_APP_ID or --app-id. The app ID is usually visible in the Base44 editor URL or VITE_BASE44_APP_ID.");
}

if (!token) {
  exitWithUsage("Missing BASE44_ACCESS_TOKEN or --access-token. Use your current Base44 access/session token; do not paste it into chat.");
}

fs.mkdirSync(outputDir, { recursive: true });

const base44 = createClient({
  appId,
  token,
  serverUrl: apiBaseUrl,
  requiresAuth: false,
});

const entities = readEntityNames(checklistPath);
const manifest = {
  status: "read_only_export",
  checklist: checklistPath,
  output_dir: outputDir,
  api_base_url: apiBaseUrl,
  app_id: appId,
  token_present: true,
  started_at: new Date().toISOString(),
  total_expected_entities: entities.length,
  exported: [],
  failed: [],
};

for (const entity of entities) {
  const outputPath = path.join(outputDir, `${entity}.json`);
  try {
    const api = base44.entities?.[entity];
    if (!api?.list) {
      throw new Error(`Entity API not available for ${entity}`);
    }

    const records = await listEntity(api, limit);
    fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));
    manifest.exported.push({
      entity,
      file: path.relative(outputDir, outputPath),
      records: Array.isArray(records) ? records.length : 0,
    });
    console.log(`exported ${entity}: ${Array.isArray(records) ? records.length : 0}`);
  } catch (error) {
    manifest.failed.push({
      entity,
      error: error?.message || String(error),
    });
    console.error(`failed ${entity}: ${error?.message || error}`);
  }
}

manifest.finished_at = new Date().toISOString();
manifest.exported_count = manifest.exported.length;
manifest.failed_count = manifest.failed.length;

fs.writeFileSync(
  path.join(outputDir, "__export_manifest.json"),
  JSON.stringify(manifest, null, 2),
);
fs.writeFileSync(
  path.join(outputDir, "__export_errors.json"),
  JSON.stringify(manifest.failed, null, 2),
);

console.log(JSON.stringify(manifest, null, 2));

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

function readEntityNames(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines.shift() || "");
  const entityIndex = header.indexOf("entity");
  if (entityIndex < 0) {
    throw new Error(`Checklist must include an entity column: ${csvPath}`);
  }

  return [...new Set(
    lines
      .map((line) => splitCsvLine(line)[entityIndex])
      .filter(Boolean)
      .map((entity) => entity.trim())
  )].sort();
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

async function listEntity(api, limit) {
  try {
    return await api.list("-created_date", limit);
  } catch (firstError) {
    try {
      return await api.list(undefined, limit);
    } catch {
      throw firstError;
    }
  }
}

function validateUrl(label, value) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL must start with http:// or https://");
    }
  } catch (error) {
    exitWithUsage(`${label} is not a valid URL: ${value}`);
  }
}

function exitWithUsage(message) {
  console.error(message);
  console.error(`
Usage:
  BASE44_API_BASE_URL=https://base44.app \
  BASE44_APP_ID=your-base44-app-id \
  BASE44_ACCESS_TOKEN=your-current-base44-access-token \
  node scripts/migration/base44_live_entity_export.mjs \
    --checklist docs/migration/BASE44_PHARMACY_ENTITY_EXPORT_CHECKLIST.csv \
    --output-dir Base44-Final-Backup/01_raw_entity_exports

Alternative CLI arguments:
  node scripts/migration/base44_live_entity_export.mjs \
    --api-base-url https://base44.app \
    --app-id your-base44-app-id \
    --access-token your-current-base44-access-token \
    --checklist docs/migration/BASE44_PHARMACY_ENTITY_EXPORT_CHECKLIST.csv \
    --output-dir Base44-Final-Backup/01_raw_entity_exports

This script is read-only. Do not paste tokens into chat or commit them.
`);
  process.exit(1);
}
