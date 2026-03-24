import { Router } from "express";
import { DataProvider } from "@nft-data-hub/adapter";
import { sendLlmResponse } from "../middleware/llm-response";
import { summarizeListings, summarizeBids } from "../../utils/summary-generator";

export function createOrdersRouter(provider: DataProvider): Router {
  const router = Router();

  // GET /api/v1/collections/:collection/listings
  router.get("/collections/:collection/listings", async (req, res, next) => {
    try {
      const { collection } = req.params;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;

      const listings = await provider.getListings(collection, {
        limit,
        offset,
        sortDirection: "asc",
      });
      sendLlmResponse(
        res,
        `Active listings for collection ${collection}`,
        listings,
        summarizeListings(listings, collection)
      );
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/collections/:collection/bids
  router.get("/collections/:collection/bids", async (req, res, next) => {
    try {
      const { collection } = req.params;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;

      const bids = await provider.getBids(collection, { limit, offset, sortDirection: "desc" });
      sendLlmResponse(
        res,
        `Active bids for collection ${collection}`,
        bids,
        summarizeBids(bids, collection)
      );
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/tokens/:collection/:tokenId/listings
  router.get("/tokens/:collection/:tokenId/listings", async (req, res, next) => {
    try {
      const { collection, tokenId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 20, 100);

      const listings = await provider.getListings(collection, {
        tokenId,
        limit,
        sortDirection: "asc",
      });
      sendLlmResponse(
        res,
        `Listings for token #${tokenId} in ${collection}`,
        listings,
        summarizeListings(listings, `${collection} #${tokenId}`)
      );
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/tokens/:collection/:tokenId/bids
  router.get("/tokens/:collection/:tokenId/bids", async (req, res, next) => {
    try {
      const { collection, tokenId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 20, 100);

      const bids = await provider.getBids(collection, { tokenId, limit, sortDirection: "desc" });
      sendLlmResponse(
        res,
        `Bids for token #${tokenId} in ${collection}`,
        bids,
        summarizeBids(bids, `${collection} #${tokenId}`)
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
