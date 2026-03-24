import { Router } from "express";
import { DataProvider, MarketEventType } from "@nft-data-hub/adapter";
import { sendLlmResponse } from "../middleware/llm-response";
import { summarizeEvents } from "../../utils/summary-generator";

const VALID_TYPES = new Set<MarketEventType>([
  "sale",
  "listing",
  "bid",
  "listing_cancel",
  "bid_cancel",
  "transfer",
  "mint",
]);

function parseTypes(raw: unknown): MarketEventType[] | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const types = raw.split(",").filter((t) => VALID_TYPES.has(t as MarketEventType));
  return types.length > 0 ? (types as MarketEventType[]) : undefined;
}

export function createEventsRouter(provider: DataProvider): Router {
  const router = Router();

  // GET /api/v1/collections/:collection/events
  router.get("/collections/:collection/events", async (req, res, next) => {
    try {
      const { collection } = req.params;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const types = parseTypes(req.query.type);

      const events = await provider.getEvents(collection, { type: types, limit, offset });
      sendLlmResponse(
        res,
        `Recent events for collection ${collection}${types ? ` (type: ${types.join(",")})` : ""}`,
        events,
        summarizeEvents(events, collection)
      );
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/tokens/:collection/:tokenId/events
  router.get("/tokens/:collection/:tokenId/events", async (req, res, next) => {
    try {
      const { collection, tokenId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const types = parseTypes(req.query.type);

      const events = await provider.getEvents(collection, { tokenId, type: types, limit, offset });
      sendLlmResponse(
        res,
        `Events for token #${tokenId} in ${collection}`,
        events,
        summarizeEvents(events, `${collection} #${tokenId}`)
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
