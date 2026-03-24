import { Router } from "express";
import { DataProvider } from "@nft-data-hub/adapter";
import { sendLlmResponse } from "../middleware/llm-response";
import { summarizeCollectionStats } from "../../utils/summary-generator";

export function createCollectionsRouter(provider: DataProvider): Router {
  const router = Router();

  // GET /api/v1/collections
  router.get("/", async (_req, res, next) => {
    try {
      const collections = await provider.getSupportedCollections();
      sendLlmResponse(
        res,
        "List of supported NFT collections",
        collections,
        `${collections.length} collection(s) available.`
      );
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/collections/:collection
  router.get("/:collection", async (req, res, next) => {
    try {
      const { collection } = req.params;
      const stats = await provider.getCollectionStats(collection);

      if (!stats) {
        res.status(404).json({
          description: "Collection not found",
          data: null,
          summary: `Collection ${collection} not found or has no data yet.`,
        });
        return;
      }

      sendLlmResponse(
        res,
        `Stats for collection ${collection}`,
        stats,
        summarizeCollectionStats(stats, collection)
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
