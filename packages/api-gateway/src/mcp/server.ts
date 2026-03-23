import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { DataProvider } from "@nft-data-hub/adapter";
import { summarizeEvents, summarizeCollectionStats } from "../utils/summary-generator";

export function createMcpServer(provider: DataProvider): McpServer {
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
        result.item = await provider.getItem(collection, tokenId);
      }

      if (sections.includes("listings")) {
        result.listings = await provider.getListings(collection, {
          tokenId,
          limit: 5,
          sortDirection: "asc",
        });
      }

      if (sections.includes("bids")) {
        result.bids = await provider.getBids(collection, {
          tokenId,
          limit: 5,
          sortDirection: "desc",
        });
      }

      if (sections.includes("recent_sales")) {
        result.recentSales = await provider.getEvents(collection, {
          tokenId,
          type: "sale",
          limit: 5,
        });
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
        const stats = await provider.getCollectionStats(collection);
        result.stats = stats;
        if (stats) {
          result.statsSummary = summarizeCollectionStats(stats, collection);
        }
      }

      if (sections.includes("floor_listings")) {
        result.floorListings = await provider.getListings(collection, {
          limit: 5,
          sortDirection: "asc",
        });
      }

      if (sections.includes("top_bids")) {
        result.topBids = await provider.getBids(collection, {
          limit: 5,
          sortDirection: "desc",
        });
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
      const events = await provider.getEvents(collection, {
        tokenId,
        type: type ?? undefined,
        limit: Math.min(limit ?? 20, 100),
      });

      const summary = summarizeEvents(events, collection);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ events, summary }, null, 2),
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
      const collections = await provider.getSupportedCollections();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                collections,
                summary: `${collections.length} collection(s) available: ${collections
                  .map((c) => c.name || c.id)
                  .join(", ")}`,
              },
              null,
              2
            ),
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
        .array(
          z.object({
            collection: z.string(),
            tokenId: z.string(),
          })
        )
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
            result.item = await provider.getItem(collection, tokenId);
          }

          if (sections.includes("listings")) {
            result.listings = await provider.getListings(collection, {
              tokenId,
              limit: 3,
              sortDirection: "asc",
            });
          }

          if (sections.includes("bids")) {
            result.bids = await provider.getBids(collection, {
              tokenId,
              limit: 3,
              sortDirection: "desc",
            });
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

export async function startMcpServer(provider: DataProvider): Promise<void> {
  const server = createMcpServer(provider);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.log("MCP Server started on stdio");
}
