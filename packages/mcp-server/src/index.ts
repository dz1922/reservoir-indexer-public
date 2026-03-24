#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server";

const API_URL = process.env.NFT_DATA_HUB_API_URL || "http://localhost:3001";

async function main() {
  const server = createMcpServer(API_URL);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`MCP Server error: ${err}\n`);
  process.exit(1);
});
