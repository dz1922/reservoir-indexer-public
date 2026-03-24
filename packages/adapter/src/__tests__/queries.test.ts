import { buildEventsQuery } from "../providers/reservoir/queries/events";

describe("buildEventsQuery", () => {
  it("builds query with sales subquery for sale type", () => {
    const { query, params } = buildEventsQuery({
      collectionId: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
      types: ["sale"],
      limit: 20,
      offset: 0,
    });

    expect(query).toContain("fill_events_2");
    expect(query).toContain("'sale' AS type");
    expect(query).not.toContain("nft_transfer_events");
    expect(params.collectionId).toBe("0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb");
    expect(params.limit).toBe(20);
  });

  it("builds query with transfers subquery for transfer type", () => {
    const { query } = buildEventsQuery({
      collectionId: "0xtest",
      types: ["transfer"],
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("nft_transfer_events");
    expect(query).not.toContain("fill_events_2");
  });

  it("builds query with orders subquery for listing type", () => {
    const { query } = buildEventsQuery({
      collectionId: "0xtest",
      types: ["listing"],
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("orders");
    expect(query).toContain("'listing'");
  });

  it("includes tokenId filter when provided", () => {
    const { query, params } = buildEventsQuery({
      collectionId: "0xtest",
      tokenId: "3100",
      types: ["sale"],
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("$/tokenId/");
    expect(params.tokenId).toBe("3100");
  });

  it("includes time range filters", () => {
    const { query, params } = buildEventsQuery({
      collectionId: "0xtest",
      types: ["sale"],
      startTime: 1000000,
      endTime: 2000000,
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("$/startTime/");
    expect(query).toContain("$/endTime/");
    expect(params.startTime).toBe(1000000);
    expect(params.endTime).toBe(2000000);
  });

  it("combines multiple event types with UNION ALL", () => {
    const { query } = buildEventsQuery({
      collectionId: "0xtest",
      types: ["sale", "transfer"],
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("fill_events_2");
    expect(query).toContain("nft_transfer_events");
    expect(query).toContain("UNION ALL");
  });

  it("includes all source tables when no types specified", () => {
    const { query } = buildEventsQuery({
      collectionId: "0xtest",
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("fill_events_2");
    expect(query).toContain("nft_transfer_events");
    expect(query).toContain("orders");
  });

  it("returns empty query for unsupported types", () => {
    const { query } = buildEventsQuery({
      collectionId: "0xtest",
      types: ["listing_cancel"],
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("FALSE");
  });

  it("orders by timestamp DESC with limit and offset", () => {
    const { query } = buildEventsQuery({
      collectionId: "0xtest",
      types: ["sale"],
      limit: 50,
      offset: 10,
    });

    expect(query).toContain("ORDER BY combined.timestamp DESC");
    expect(query).toContain("LIMIT $/limit/");
    expect(query).toContain("OFFSET $/offset/");
  });
});
