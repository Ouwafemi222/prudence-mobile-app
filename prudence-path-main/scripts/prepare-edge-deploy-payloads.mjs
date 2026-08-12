#!/usr/bin/env node
/**
 * Builds /tmp/deploy-<function>.json payloads for Supabase Edge deploy (MCP or CLI).
 * Run: node scripts/prepare-edge-deploy-payloads.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const functionsDir = path.join(root, "supabase/functions");
const sharedDir = path.join(functionsDir, "_shared");

const shared = [
  "cors.ts",
  "supabase-admin.ts",
  "email-layout.ts",
  "resend.ts",
  "notify.ts",
  "admin-notify.ts",
];

const sharedFiles = shared.map((f) => ({
  name: `_shared/${f}`,
  content: fs.readFileSync(path.join(sharedDir, f), "utf8"),
}));

const funcs = [
  "notify-admin-signup",
  "notify-admin-approved",
  "notify-sponsor-signup",
  "notify-user",
  "prepare-signup",
  "delete-user",
  "daily-reminder-notifications",
  "missed-submission-alerts",
  "weekly-summary-notifications",
];

const jwt = {
  "notify-admin-signup": true,
  "notify-admin-approved": true,
  "notify-sponsor-signup": true,
  "notify-user": true,
  "prepare-signup": true,
  "delete-user": true,
  "daily-reminder-notifications": false,
  "missed-submission-alerts": false,
  "weekly-summary-notifications": false,
};

for (const fn of funcs) {
  let idx = fs
    .readFileSync(path.join(functionsDir, fn, "index.ts"), "utf8")
    .replaceAll("../_shared/", "./_shared/");
  const payload = {
    name: fn,
    entrypoint_path: "index.ts",
    verify_jwt: jwt[fn],
    files: [{ name: "index.ts", content: idx }, ...sharedFiles],
  };
  fs.writeFileSync(`/tmp/deploy-${fn}.json`, JSON.stringify(payload));
}

console.log("Prepared", funcs.length, "payloads in /tmp/deploy-<name>.json");
