/* eslint-disable no-console */
import express from "express";
import cors from "cors";

import { ReservoirDataProvider, CollectionRegistry } from "@nft-data-hub/adapter";

import { createCollectionsRouter } from "./rest/routes/collections";
import { createTokensRouter } from "./rest/routes/tokens";
import { createOrdersRouter } from "./rest/routes/orders";
import { createEventsRouter } from "./rest/routes/events";
import { errorHandler } from "./rest/middleware/error-handler";
import { startMcpServer } from "./mcp/server";

const PORT = Number(process.env.API_GATEWAY_PORT || 3001);
const DATABASE_URL = process.env.DATABASE_URL;
const MODE = process.env.API_GATEWAY_MODE || "rest"; // "rest" | "mcp" | "both"

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const registry = new CollectionRegistry();

const provider = new ReservoirDataProvider({
  databaseUrl: DATABASE_URL,
  collections: registry.getAll(),
});

async function startRestServer(): Promise<void> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // REST API routes
  app.use("/api/v1/collections", createCollectionsRouter(provider));
  app.use("/api/v1", createTokensRouter(provider));
  app.use("/api/v1", createOrdersRouter(provider));
  app.use("/api/v1", createEventsRouter(provider));

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`NFT Data Hub API Gateway running on port ${PORT}`);
    console.log(`  REST API: http://localhost:${PORT}/api/v1`);
    console.log(`  Health:   http://localhost:${PORT}/health`);
  });
}

async function main(): Promise<void> {
  console.log(`Starting API Gateway (mode=${MODE})...`);
  console.log(
    `Supported collections: ${
      registry
        .getEnabled()
        .map((c) => c.id)
        .join(", ") || "none"
    }`
  );

  if (MODE === "mcp") {
    await startMcpServer(provider);
  } else if (MODE === "both") {
    await startRestServer();
    // MCP on stdio would conflict with REST logging; run separately
    console.log("Note: MCP server should be run separately with API_GATEWAY_MODE=mcp");
  } else {
    await startRestServer();
  }
}

main().catch((err) => {
  console.error("Failed to start API Gateway:", err);
  process.exit(1);
});
