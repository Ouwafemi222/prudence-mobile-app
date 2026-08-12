#!/usr/bin/env node
/**
 * Prints deploy args for each function (stdout one JSON line per function).
 * Agent reads and calls mcp deploy_edge_function per line.
 */
import fs from "fs";

const funcs = [
  "notify-admin-approved",
  "notify-sponsor-signup",
  "notify-user",
  "prepare-signup",
  "delete-user",
  "daily-reminder-notifications",
  "missed-submission-alerts",
  "weekly-summary-notifications",
];

for (const fn of funcs) {
  const path = `/tmp/mcp-deploy-${fn}-args.json`;
  const args = JSON.parse(fs.readFileSync(path, "utf8"));
  console.log(JSON.stringify({ fn, size: JSON.stringify(args).length, verify_jwt: args.verify_jwt }));
}
