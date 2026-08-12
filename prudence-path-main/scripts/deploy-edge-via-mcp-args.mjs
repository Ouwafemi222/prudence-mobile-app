#!/usr/bin/env node
/**
 * Prints deploy args JSON for each function (for MCP deploy_edge_function).
 * Usage: node scripts/deploy-edge-via-mcp-args.mjs <function-name>
 */
import fs from "fs";

const fn = process.argv[2];
if (!fn) {
  console.error("Usage: node scripts/deploy-edge-via-mcp-args.mjs <function-name>");
  process.exit(1);
}
const path = `/tmp/deploy-call-${fn}.json`;
const p = JSON.parse(fs.readFileSync(path, "utf8"));
process.stdout.write(
  JSON.stringify({
    name: p.name,
    entrypoint_path: p.entrypoint_path,
    verify_jwt: p.verify_jwt,
    files: p.files,
  }),
);
