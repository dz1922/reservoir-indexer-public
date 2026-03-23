import { Router } from "express";
import { DataProvider } from "@nft-data-hub/adapter";
import { sendLlmResponse } from "../middleware/llm-response";

export function createTokensRouter(provider: DataProvider): Router {
  const router = Router();

  // GET /api/v1/collections/:collection/tokens
  router.get("/collections/:collection/tokens", async (req, res, next) => {
    try {
      const { collection } = req.params;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;

      const items = await provider.getItems(collection, { limit, offset });
      sendLlmResponse(
        res,
        `Tokens in collection ${collection} (offset=${offset}, limit=${limit})`,
        items,
        `${items.length} token(s) returned.`
      );
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/collections/:collection/tokens/:tokenId
  router.get("/collections/:collection/tokens/:tokenId", async (req, res, next) => {
    try {
      const { collection, tokenId } = req.params;
      const item = await provider.getItem(collection, tokenId);

      if (!item) {
        res.status(404).json({
          description: "Token not found",
          data: null,
          summary: `Token #${tokenId} not found in collection ${collection}.`,
        });
        return;
      }

      sendLlmResponse(
        res,
        `Details for token #${tokenId} in ${collection}`,
        item,
        `${item.name ?? `Token #${tokenId}`}${
          item.metadata ? `, ${Object.keys(item.metadata).length} attributes` : ""
        }.`
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
