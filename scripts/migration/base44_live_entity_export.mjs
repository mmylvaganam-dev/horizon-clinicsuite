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
const appId = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
const token = process.env.BASE44_ACCESS_TOKEN;

if (!checklistPath) {
  exitWithUsage("Missing --checklist");
}

if (!appId) {
  exitWithUsage("Missing BASE44_APP_ID");
}

if (!token) {
  exitWithUsage("Missing BASE44_ACCESS_TOKEN");
}

fs.mkdirSync(outputDir, { recursive: true });

const base44 = createClient({
  appId,
  token,
  serverUrl: "",
  requiresAuth: false,
});

const entities = readEntityNames(checklistPath);
const manifest = {
  status: "read_only_export",
  checklist: checklistPath,
  output_dir: outputDir,
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

function exitWithUsage(message) {
  console.error(message);
  console.error(`
Usage:
  BASE44_APP_ID=... BASE44_ACCESS_TOKEN=... node scripts/migration/base44_live_entity_export.mjs \
    --checklist docs/migration/BASE44_PHARMACY_ENTITY_EXPORT_CHECKLIST.csv \
    --output-dir Base44-Final-Backup/01_raw_entity_exports

This script is read-only. Do not paste tokens into chat or commit them.
`);
  process.exit(1);
}
