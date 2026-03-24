import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ApiClient } from "./api-client";

export function createMcpServer(apiUrl: string): McpServer {
  const api = new ApiClient(apiUrl);

  const server = new McpServer({
    name: "nft-data-hub",
    version: "0.0.1",
  });

  // Tool 1: get_item
  server.tool(
    "get_item",
    "Get detailed information about a specific NFT token, including metadata, active listings, bids, and recent sales",
    {
      collection: z.string().describe("Collection ID (contract address)"),
      tokenId: z.string().describe("Token ID within the collection"),
      include: z
        .array(z.enum(["metadata", "listings", "bids", "recent_sales"]))
        .optional()
        .describe("Data to include. Defaults to all."),
    },
    async ({ collection, tokenId, include }) => {
      const sections = include ?? ["metadata", "listings", "bids", "recent_sales"];
      const result: Record<string, unknown> = {};

      if (sections.includes("metadata")) {
        const res = await api.get(`/api/v1/collections/${collection}/tokens/${tokenId}`);
        result.item = res.data;
      }

      if (sections.includes("listings")) {
        const res = await api.get(`/api/v1/tokens/${collection}/${tokenId}/listings?limit=5`);
        result.listings = res.data;
      }

      if (sections.includes("bids")) {
        const res = await api.get(`/api/v1/tokens/${collection}/${tokenId}/bids?limit=5`);
        result.bids = res.data;
      }

      if (sections.includes("recent_sales")) {
        const res = await api.get(
          `/api/v1/tokens/${collection}/${tokenId}/events?type=sale&limit=5`
        );
        result.recentSales = res.data;
        result.recentSalesSummary = res.summary;
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool 2: get_collection
  server.tool(
    "get_collection",
    "Get collection-level information including stats, floor listings, and top bids",
    {
      collection: z.string().describe("Collection ID (contract address)"),
      include: z
        .array(z.enum(["stats", "floor_listings", "top_bids"]))
        .optional()
        .describe("Data to include. Defaults to all."),
    },
    async ({ collection, include }) => {
      const sections = include ?? ["stats", "floor_listings", "top_bids"];
      const result: Record<string, unknown> = {};

      if (sections.includes("stats")) {
        const res = await api.get(`/api/v1/collections/${collection}`);
        result.stats = res.data;
        result.statsSummary = res.summary;
      }

      if (sections.includes("floor_listings")) {
        const res = await api.get(`/api/v1/collections/${collection}/listings?limit=5`);
        result.floorListings = res.data;
      }

      if (sections.includes("top_bids")) {
        const res = await api.get(`/api/v1/collections/${collection}/bids?limit=5`);
        result.topBids = res.data;
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool 3: get_events
  server.tool(
    "get_events",
    "Get market events (sales, listings, bids, transfers, mints, cancellations) for a collection or specific token",
    {
      collection: z.string().describe("Collection ID (contract address)"),
      tokenId: z.string().optional().describe("Optional: filter to a specific token"),
      type: z
        .enum(["sale", "listing", "bid", "transfer", "listing_cancel", "bid_cancel", "mint"])
        .optional()
        .describe("Optional: filter by event type"),
      limit: z.number().optional().describe("Max results (default 20, max 100)"),
    },
    async ({ collection, tokenId, type, limit }) => {
      const l = Math.min(limit ?? 20, 100);
      const typeParam = type ? `&type=${type}` : "";

      const path = tokenId
        ? `/api/v1/tokens/${collection}/${tokenId}/events?limit=${l}${typeParam}`
        : `/api/v1/collections/${collection}/events?limit=${l}${typeParam}`;

      const res = await api.get(path);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ events: res.data, summary: res.summary }, null, 2),
          },
        ],
      };
    }
  );

  // Tool 4: get_supported_collections
  server.tool(
    "get_supported_collections",
    "List all NFT collections currently supported by this data hub",
    { _unused: z.string().optional().describe("No parameters needed") },
    async () => {
      const res = await api.get("/api/v1/collections");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ collections: res.data, summary: res.summary }, null, 2),
          },
        ],
      };
    }
  );

  // Tool 5: get_items_batch
  server.tool(
    "get_items_batch",
    "Get details for multiple NFT tokens in a single call (max 20). Useful for comparing tokens.",
    {
      items: z
        .array(z.object({ collection: z.string(), tokenId: z.string() }))
        .max(20)
        .describe("Array of {collection, tokenId} pairs (max 20)"),
      include: z
        .array(z.enum(["metadata", "listings", "bids"]))
        .optional()
        .describe("Data to include per item. Defaults to metadata only."),
    },
    async ({ items, include }) => {
      const sections = include ?? ["metadata"];

      const results = await Promise.all(
        items.map(async ({ collection, tokenId }) => {
          const result: Record<string, unknown> = { collection, tokenId };

          if (sections.includes("metadata")) {
            const res = await api.get(`/api/v1/collections/${collection}/tokens/${tokenId}`);
            result.item = res.data;
          }

          if (sections.includes("listings")) {
            const res = await api.get(`/api/v1/tokens/${collection}/${tokenId}/listings?limit=3`);
            result.listings = res.data;
          }

          if (sections.includes("bids")) {
            const res = await api.get(`/api/v1/tokens/${collection}/${tokenId}/bids?limit=3`);
            result.bids = res.data;
          }

          return result;
        })
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  return server;
}
