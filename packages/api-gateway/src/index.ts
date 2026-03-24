/* eslint-disable no-console */
import express from "express";
import cors from "cors";

import { ReservoirDataProvider, CollectionRegistry } from "@nft-data-hub/adapter";

import { createCollectionsRouter } from "./rest/routes/collections";
import { createTokensRouter } from "./rest/routes/tokens";
import { createOrdersRouter } from "./rest/routes/orders";
import { createEventsRouter } from "./rest/routes/events";
import { errorHandler } from "./rest/middleware/error-handler";

const PORT = Number(process.env.API_GATEWAY_PORT || 3001);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const registry = new CollectionRegistry();

const provider = new ReservoirDataProvider({
  databaseUrl: DATABASE_URL,
  collections: registry.getAll(),
});

async function main(): Promise<void> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/collections", createCollectionsRouter(provider));
  app.use("/api/v1", createTokensRouter(provider));
  app.use("/api/v1", createOrdersRouter(provider));
  app.use("/api/v1", createEventsRouter(provider));

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`NFT Data Hub REST API running on port ${PORT}`);
    console.log(`  API:    http://localhost:${PORT}/api/v1`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(
      `  Collections: ${
        registry
          .getEnabled()
          .map((c) => c.id)
          .join(", ") || "none"
      }`
    );
  });
}

main().catch((err) => {
  console.error("Failed to start API Gateway:", err);
  process.exit(1);
});
