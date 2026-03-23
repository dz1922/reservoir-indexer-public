import express from "express";
import request from "supertest";
import { DataProvider, Order } from "@nft-data-hub/adapter";
import { Item, MarketEvent, CollectionStats } from "@nft-data-hub/adapter";
import { createCollectionsRouter } from "../rest/routes/collections";
import { createTokensRouter } from "../rest/routes/tokens";
import { createOrdersRouter } from "../rest/routes/orders";
import { createEventsRouter } from "../rest/routes/events";
import { errorHandler } from "../rest/middleware/error-handler";

// Mock DataProvider
function createMockProvider(overrides: Partial<DataProvider> = {}): DataProvider {
  return {
    name: "mock",
    getItem: jest.fn().mockResolvedValue(null),
    getItems: jest.fn().mockResolvedValue([]),
    getEvents: jest.fn().mockResolvedValue([]),
    getListings: jest.fn().mockResolvedValue([]),
    getBids: jest.fn().mockResolvedValue([]),
    getFloorPrice: jest.fn().mockResolvedValue(null),
    getCollectionStats: jest.fn().mockResolvedValue(null),
    getSupportedCollections: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createApp(provider: DataProvider) {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/collections", createCollectionsRouter(provider));
  app.use("/api/v1", createTokensRouter(provider));
  app.use("/api/v1", createOrdersRouter(provider));
  app.use("/api/v1", createEventsRouter(provider));
  app.use(errorHandler);
  return app;
}

describe("GET /api/v1/collections", () => {
  it("returns supported collections with LLM response format", async () => {
    const provider = createMockProvider({
      getSupportedCollections: jest
        .fn()
        .mockResolvedValue([
          { id: "0xpunks", name: "CryptoPunks", contract: "0xpunks", enabled: true },
        ]),
    });
    const app = createApp(provider);

    const res = await request(app).get("/api/v1/collections");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("description");
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("summary");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("0xpunks");
  });

  it("returns empty array when no collections", async () => {
    const app = createApp(createMockProvider());
    const res = await request(app).get("/api/v1/collections");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe("GET /api/v1/collections/:collection", () => {
  it("returns collection stats", async () => {
    const stats: CollectionStats = {
      floorAsk: { amount: "50", currency: "ETH" },
      topBid: { amount: "45", currency: "ETH" },
      lastSale: null,
      onSaleCount: 10,
      volume: { "1d": 100, "7d": 500, "30d": 2000 },
      volumeChange: { "1d": 0.1, "7d": null, "30d": null },
      floorSale: { "1d": 49, "7d": null, "30d": null },
      floorSaleChange: { "1d": null, "7d": null, "30d": null },
    };

    const provider = createMockProvider({
      getCollectionStats: jest.fn().mockResolvedValue(stats),
    });
    const app = createApp(provider);

    const res = await request(app).get("/api/v1/collections/0xpunks");
    expect(res.status).toBe(200);
    expect(res.body.data.floorAsk.amount).toBe("50");
    expect(res.body.summary).toContain("Floor: 50 ETH");
  });

  it("returns 404 for unknown collection", async () => {
    const app = createApp(createMockProvider());
    const res = await request(app).get("/api/v1/collections/0xunknown");
    expect(res.status).toBe(404);
    expect(res.body.summary).toContain("not found");
  });
});

describe("GET /api/v1/collections/:collection/tokens/:tokenId", () => {
  it("returns token details", async () => {
    const item: Item = {
      id: "0xpunks:3100",
      collection: "0xpunks",
      tokenId: "3100",
      name: "CryptoPunk #3100",
      image: "https://example.com/3100.png",
      metadata: { type: "Alien" },
    };

    const provider = createMockProvider({
      getItem: jest.fn().mockResolvedValue(item),
    });
    const app = createApp(provider);

    const res = await request(app).get("/api/v1/collections/0xpunks/tokens/3100");
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("CryptoPunk #3100");
    expect(res.body.data.metadata.type).toBe("Alien");
  });

  it("returns 404 for unknown token", async () => {
    const app = createApp(createMockProvider());
    const res = await request(app).get("/api/v1/collections/0xpunks/tokens/99999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/collections/:collection/tokens", () => {
  it("returns paginated token list", async () => {
    const items: Item[] = [
      { id: "0xp:0", collection: "0xp", tokenId: "0", metadata: {} },
      { id: "0xp:1", collection: "0xp", tokenId: "1", metadata: {} },
    ];

    const provider = createMockProvider({
      getItems: jest.fn().mockResolvedValue(items),
    });
    const app = createApp(provider);

    const res = await request(app).get("/api/v1/collections/0xp/tokens?limit=2&offset=0");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(provider.getItems).toHaveBeenCalledWith("0xp", { limit: 2, offset: 0 });
  });

  it("caps limit at 100", async () => {
    const provider = createMockProvider();
    const app = createApp(provider);

    await request(app).get("/api/v1/collections/0xp/tokens?limit=500");
    expect(provider.getItems).toHaveBeenCalledWith("0xp", { limit: 100, offset: 0 });
  });
});

describe("GET /api/v1/collections/:collection/listings", () => {
  it("returns listings sorted by price asc", async () => {
    const listings: Order[] = [
      {
        id: "o1",
        side: "listing",
        maker: "0xa",
        price: { amount: "50", currency: "ETH" },
        collection: "0xp",
        tokenId: "1",
        createdAt: 1000,
      },
    ];

    const provider = createMockProvider({
      getListings: jest.fn().mockResolvedValue(listings),
    });
    const app = createApp(provider);

    const res = await request(app).get("/api/v1/collections/0xp/listings");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.summary).toContain("1 listing(s)");
  });
});

describe("GET /api/v1/collections/:collection/bids", () => {
  it("returns bids sorted by price desc", async () => {
    const provider = createMockProvider({
      getBids: jest.fn().mockResolvedValue([]),
    });
    const app = createApp(provider);

    const res = await request(app).get("/api/v1/collections/0xp/bids");
    expect(res.status).toBe(200);
    expect(provider.getBids).toHaveBeenCalledWith(
      "0xp",
      expect.objectContaining({ sortDirection: "desc" })
    );
  });
});

describe("GET /api/v1/tokens/:collection/:tokenId/listings", () => {
  it("passes tokenId to provider", async () => {
    const provider = createMockProvider();
    const app = createApp(provider);

    await request(app).get("/api/v1/tokens/0xp/3100/listings");
    expect(provider.getListings).toHaveBeenCalledWith(
      "0xp",
      expect.objectContaining({ tokenId: "3100" })
    );
  });
});

describe("GET /api/v1/tokens/:collection/:tokenId/bids", () => {
  it("passes tokenId to provider", async () => {
    const provider = createMockProvider();
    const app = createApp(provider);

    await request(app).get("/api/v1/tokens/0xp/3100/bids");
    expect(provider.getBids).toHaveBeenCalledWith(
      "0xp",
      expect.objectContaining({ tokenId: "3100" })
    );
  });
});

describe("GET /api/v1/collections/:collection/events", () => {
  it("returns events with type filter", async () => {
    const events: MarketEvent[] = [
      {
        type: "sale",
        item: { collection: "0xp", tokenId: "1" },
        from: "0xa",
        timestamp: 1000,
      },
    ];

    const provider = createMockProvider({
      getEvents: jest.fn().mockResolvedValue(events),
    });
    const app = createApp(provider);

    const res = await request(app).get("/api/v1/collections/0xp/events?type=sale");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(provider.getEvents).toHaveBeenCalledWith(
      "0xp",
      expect.objectContaining({ type: ["sale"] })
    );
  });

  it("supports multiple type filters", async () => {
    const provider = createMockProvider();
    const app = createApp(provider);

    await request(app).get("/api/v1/collections/0xp/events?type=sale,transfer");
    expect(provider.getEvents).toHaveBeenCalledWith(
      "0xp",
      expect.objectContaining({ type: ["sale", "transfer"] })
    );
  });

  it("ignores invalid type filters", async () => {
    const provider = createMockProvider();
    const app = createApp(provider);

    await request(app).get("/api/v1/collections/0xp/events?type=invalid_type");
    expect(provider.getEvents).toHaveBeenCalledWith(
      "0xp",
      expect.objectContaining({ type: undefined })
    );
  });
});

describe("GET /api/v1/tokens/:collection/:tokenId/events", () => {
  it("passes tokenId to provider", async () => {
    const provider = createMockProvider();
    const app = createApp(provider);

    await request(app).get("/api/v1/tokens/0xp/7804/events?type=sale&limit=5");
    expect(provider.getEvents).toHaveBeenCalledWith(
      "0xp",
      expect.objectContaining({ tokenId: "7804", type: ["sale"], limit: 5 })
    );
  });
});

describe("LLM response format", () => {
  it("all responses have description, data, summary", async () => {
    const provider = createMockProvider({
      getSupportedCollections: jest.fn().mockResolvedValue([]),
    });
    const app = createApp(provider);

    const endpoints = [
      "/api/v1/collections",
      "/api/v1/collections/0xp/tokens",
      "/api/v1/collections/0xp/listings",
      "/api/v1/collections/0xp/bids",
      "/api/v1/collections/0xp/events",
    ];

    for (const endpoint of endpoints) {
      const res = await request(app).get(endpoint);
      expect(res.body).toHaveProperty("description");
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("summary");
    }
  });
});

describe("Error handling", () => {
  it("returns 500 with LLM format on provider error", async () => {
    const provider = createMockProvider({
      getSupportedCollections: jest.fn().mockRejectedValue(new Error("DB connection failed")),
    });
    const app = createApp(provider);

    const res = await request(app).get("/api/v1/collections");
    expect(res.status).toBe(500);
    expect(res.body.summary).toContain("DB connection failed");
  });
});
