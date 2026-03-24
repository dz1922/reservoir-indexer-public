import { mapTokenToItem, fromBuffer } from "../providers/reservoir/mappers/item-mapper";
import { mapRowToEvent } from "../providers/reservoir/mappers/event-mapper";
import { mapStatsRow } from "../providers/reservoir/mappers/stats-mapper";
import { TokenRow } from "../providers/reservoir/queries/items";
import { EventRow } from "../providers/reservoir/queries/events";
import { CollectionStatsRow, LastSaleRow } from "../providers/reservoir/queries/stats";

describe("fromBuffer", () => {
  it("converts Buffer to 0x-prefixed hex string", () => {
    const buf = Buffer.from("b47e3cd837ddf8e4c57f05d70ab865de6e193bbb", "hex");
    expect(fromBuffer(buf)).toBe("0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb");
  });

  it("handles zero address", () => {
    const buf = Buffer.from("0000000000000000000000000000000000000000", "hex");
    expect(fromBuffer(buf)).toBe("0x0000000000000000000000000000000000000000");
  });
});

describe("mapTokenToItem", () => {
  it("maps a complete token row to Item", () => {
    const row: TokenRow = {
      contract: Buffer.from("b47e3cd837ddf8e4c57f05d70ab865de6e193bbb", "hex"),
      token_id: "3100",
      name: "CryptoPunk #3100",
      image: "https://example.com/punk3100.png",
      collection_id: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
      metadata: { type: "Alien", accessories: ["Headband"] },
    };

    const item = mapTokenToItem(row);
    expect(item.id).toBe("0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb:3100");
    expect(item.collection).toBe("0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb");
    expect(item.tokenId).toBe("3100");
    expect(item.name).toBe("CryptoPunk #3100");
    expect(item.image).toBe("https://example.com/punk3100.png");
    expect(item.metadata).toEqual({ type: "Alien", accessories: ["Headband"] });
  });

  it("handles null name and image", () => {
    const row: TokenRow = {
      contract: Buffer.from("b47e3cd837ddf8e4c57f05d70ab865de6e193bbb", "hex"),
      token_id: "0",
      name: null,
      image: null,
      collection_id: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
      metadata: null,
    };

    const item = mapTokenToItem(row);
    expect(item.name).toBeUndefined();
    expect(item.image).toBeUndefined();
    expect(item.metadata).toEqual({});
  });
});

describe("mapRowToEvent", () => {
  const baseRow: EventRow = {
    type: "sale",
    contract: Buffer.from("b47e3cd837ddf8e4c57f05d70ab865de6e193bbb", "hex"),
    token_id: "7804",
    collection_id: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
    from_address: Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "hex"),
    to_address: Buffer.from("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "hex"),
    price: "75000000000000000000",
    currency: Buffer.from("0000000000000000000000000000000000000000", "hex"),
    usd_price: "142500",
    timestamp: 1711152000,
    tx_hash: Buffer.from("cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc", "hex"),
    order_source_id_int: null,
  };

  it("maps sale event correctly", () => {
    const event = mapRowToEvent(baseRow);
    expect(event.type).toBe("sale");
    expect(event.item.tokenId).toBe("7804");
    expect(event.from).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(event.to).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(event.price?.amount).toBe("75000000000000000000");
    expect(event.price?.usdAmount).toBe("142500");
    expect(event.timestamp).toBe(1711152000);
    expect(event.txHash).toBeDefined();
  });

  it("maps Reservoir 'ask' type to 'listing'", () => {
    const event = mapRowToEvent({ ...baseRow, type: "ask" });
    expect(event.type).toBe("listing");
  });

  it("maps Reservoir 'bid' type to 'bid'", () => {
    const event = mapRowToEvent({ ...baseRow, type: "bid" });
    expect(event.type).toBe("bid");
  });

  it("maps Reservoir 'ask_cancel' to 'listing_cancel'", () => {
    const event = mapRowToEvent({ ...baseRow, type: "ask_cancel" });
    expect(event.type).toBe("listing_cancel");
  });

  it("maps Reservoir 'bid_cancel' to 'bid_cancel'", () => {
    const event = mapRowToEvent({ ...baseRow, type: "bid_cancel" });
    expect(event.type).toBe("bid_cancel");
  });

  it("maps transfer event", () => {
    const event = mapRowToEvent({ ...baseRow, type: "transfer" });
    expect(event.type).toBe("transfer");
  });

  it("maps mint event", () => {
    const event = mapRowToEvent({ ...baseRow, type: "mint" });
    expect(event.type).toBe("mint");
  });

  it("handles null to_address", () => {
    const event = mapRowToEvent({ ...baseRow, to_address: null });
    expect(event.to).toBeUndefined();
  });

  it("handles null price", () => {
    const event = mapRowToEvent({ ...baseRow, price: null, currency: null, usd_price: null });
    expect(event.price).toBeUndefined();
  });

  it("handles null tx_hash", () => {
    const event = mapRowToEvent({ ...baseRow, tx_hash: null });
    expect(event.txHash).toBeUndefined();
  });
});

describe("mapStatsRow", () => {
  const baseStats: CollectionStatsRow = {
    floor_sell_value: "50000000000000000000",
    top_buy_value: "45000000000000000000",
    on_sale_count: "120",
    day1_volume: "500000000000000000000",
    day7_volume: "3000000000000000000000",
    day30_volume: "10000000000000000000000",
    day1_volume_change: 0.15,
    day7_volume_change: -0.05,
    day30_volume_change: 0.25,
    day1_floor_sell_value: "48000000000000000000",
    day7_floor_sell_value: "52000000000000000000",
    day30_floor_sell_value: "40000000000000000000",
  };

  const lastSale: LastSaleRow = {
    price: "55000000000000000000",
    timestamp: 1711152000,
  };

  it("maps complete stats correctly", () => {
    const stats = mapStatsRow(baseStats, lastSale);

    expect(stats.floorAsk?.amount).toBe("50");
    expect(stats.floorAsk?.currency).toBe("ETH");
    expect(stats.topBid?.amount).toBe("45");
    expect(stats.onSaleCount).toBe(120);
    expect(stats.volume["1d"]).toBe(500);
    expect(stats.volume["7d"]).toBe(3000);
    expect(stats.volume["30d"]).toBe(10000);
    expect(stats.volumeChange["1d"]).toBe(0.15);
    expect(stats.volumeChange["7d"]).toBe(-0.05);
    expect(stats.floorSale["1d"]).toBe(48);
    expect(stats.floorSale["30d"]).toBe(40);
  });

  it("maps last sale correctly", () => {
    const stats = mapStatsRow(baseStats, lastSale);
    expect(stats.lastSale?.price.amount).toBe("55");
    expect(stats.lastSale?.timestamp).toBe(1711152000);
  });

  it("handles null last sale", () => {
    const stats = mapStatsRow(baseStats, null);
    expect(stats.lastSale).toBeNull();
  });

  it("handles null floor/bid values", () => {
    const nullStats: CollectionStatsRow = {
      ...baseStats,
      floor_sell_value: null,
      top_buy_value: null,
    };
    const stats = mapStatsRow(nullStats, null);
    expect(stats.floorAsk).toBeNull();
    expect(stats.topBid).toBeNull();
  });

  it("handles null volume values", () => {
    const nullStats: CollectionStatsRow = {
      ...baseStats,
      day1_volume: null,
      day7_volume: null,
      day30_volume: null,
    };
    const stats = mapStatsRow(nullStats, null);
    expect(stats.volume["1d"]).toBeNull();
    expect(stats.volume["7d"]).toBeNull();
    expect(stats.volume["30d"]).toBeNull();
  });
});
