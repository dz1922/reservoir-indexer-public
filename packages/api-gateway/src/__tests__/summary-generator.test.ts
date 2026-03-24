import {
  summarizeEvents,
  summarizeCollectionStats,
  summarizeListings,
  summarizeBids,
} from "../utils/summary-generator";
import { MarketEvent, CollectionStats } from "@nft-data-hub/adapter";
import { Order } from "@nft-data-hub/adapter";

describe("summarizeEvents", () => {
  it("returns no events message for empty array", () => {
    expect(summarizeEvents([], "cryptopunks")).toBe("No recent events for cryptopunks.");
  });

  it("summarizes sales", () => {
    const events: MarketEvent[] = [
      {
        type: "sale",
        item: { collection: "cryptopunks", tokenId: "3100" },
        from: "0xaaa",
        to: "0xbbb",
        price: { amount: "75.0", currency: "ETH" },
        timestamp: Math.floor(Date.now() / 1000) - 3600,
      },
    ];

    const summary = summarizeEvents(events, "cryptopunks");
    expect(summary).toContain("token #3100");
    expect(summary).toContain("75.0 ETH");
    expect(summary).toContain("1 total events returned");
  });

  it("includes listing count", () => {
    const events: MarketEvent[] = [
      {
        type: "listing",
        item: { collection: "cryptopunks", tokenId: "1" },
        from: "0xaaa",
        timestamp: Math.floor(Date.now() / 1000),
      },
      {
        type: "listing",
        item: { collection: "cryptopunks", tokenId: "2" },
        from: "0xbbb",
        timestamp: Math.floor(Date.now() / 1000),
      },
    ];

    const summary = summarizeEvents(events, "cryptopunks");
    expect(summary).toContain("2 new listing(s)");
  });
});

describe("summarizeCollectionStats", () => {
  it("includes floor price and top bid", () => {
    const stats: CollectionStats = {
      floorAsk: { amount: "50", currency: "ETH" },
      topBid: { amount: "45", currency: "ETH" },
      lastSale: null,
      onSaleCount: 120,
      volume: { "1d": 500, "7d": 3000, "30d": 10000 },
      volumeChange: { "1d": 0.15, "7d": -0.05, "30d": 0.25 },
      floorSale: { "1d": 48, "7d": 52, "30d": 40 },
      floorSaleChange: { "1d": null, "7d": null, "30d": null },
    };

    const summary = summarizeCollectionStats(stats, "cryptopunks");
    expect(summary).toContain("Floor: 50 ETH");
    expect(summary).toContain("Top bid: 45 ETH");
    expect(summary).toContain("120 listed");
    expect(summary).toContain("24h volume: 500.00 ETH");
  });

  it("handles null values gracefully", () => {
    const stats: CollectionStats = {
      floorAsk: null,
      topBid: null,
      lastSale: null,
      onSaleCount: 0,
      volume: { "1d": null, "7d": null, "30d": null },
      volumeChange: { "1d": null, "7d": null, "30d": null },
      floorSale: { "1d": null, "7d": null, "30d": null },
      floorSaleChange: { "1d": null, "7d": null, "30d": null },
    };

    const summary = summarizeCollectionStats(stats, "empty-collection");
    expect(summary).toContain("0 listed");
    expect(summary).not.toContain("Floor:");
    expect(summary).not.toContain("Top bid:");
  });
});

describe("summarizeListings", () => {
  it("returns no listings message for empty array", () => {
    expect(summarizeListings([], "cryptopunks")).toBe("No active listings for cryptopunks.");
  });

  it("summarizes with cheapest listing", () => {
    const listings: Order[] = [
      {
        id: "order1",
        side: "listing",
        maker: "0xaaa",
        price: { amount: "50", currency: "ETH" },
        tokenId: "3100",
        collection: "cryptopunks",
        createdAt: 1000,
      },
      {
        id: "order2",
        side: "listing",
        maker: "0xbbb",
        price: { amount: "55", currency: "ETH" },
        tokenId: "7804",
        collection: "cryptopunks",
        createdAt: 1000,
      },
    ];

    const summary = summarizeListings(listings, "cryptopunks");
    expect(summary).toContain("2 listing(s)");
    expect(summary).toContain("token #3100");
    expect(summary).toContain("50 ETH");
  });
});

describe("summarizeBids", () => {
  it("returns no bids message for empty array", () => {
    expect(summarizeBids([], "cryptopunks")).toBe("No active bids for cryptopunks.");
  });

  it("summarizes with highest bid", () => {
    const bids: Order[] = [
      {
        id: "bid1",
        side: "bid",
        maker: "0xaaa",
        price: { amount: "45", currency: "ETH" },
        tokenId: "3100",
        collection: "cryptopunks",
        createdAt: 1000,
      },
    ];

    const summary = summarizeBids(bids, "cryptopunks");
    expect(summary).toContain("1 bid(s)");
    expect(summary).toContain("45 ETH");
    expect(summary).toContain("token #3100");
  });

  it("handles collection-wide bids without tokenId", () => {
    const bids: Order[] = [
      {
        id: "bid1",
        side: "bid",
        maker: "0xaaa",
        price: { amount: "40", currency: "ETH" },
        collection: "cryptopunks",
        createdAt: 1000,
      },
    ];

    const summary = summarizeBids(bids, "cryptopunks");
    expect(summary).toContain("collection-wide");
  });
});
