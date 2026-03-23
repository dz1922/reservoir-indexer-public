import { buildEventsQuery } from "../providers/reservoir/queries/events";

describe("buildEventsQuery", () => {
  it("builds base query with collection filter", () => {
    const { query, params } = buildEventsQuery({
      collectionId: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
      limit: 20,
      offset: 0,
    });

    expect(query).toContain("a.collection_id = $/collectionId/");
    expect(query).toContain("LIMIT $/limit/");
    expect(query).toContain("ORDER BY a.created_at DESC");
    expect(params.collectionId).toBe("0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb");
    expect(params.limit).toBe(20);
    expect(params.offset).toBe(0);
  });

  it("adds tokenId filter when provided", () => {
    const { query, params } = buildEventsQuery({
      collectionId: "0xtest",
      tokenId: "3100",
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("a.token_id = $/tokenId/");
    expect(params.tokenId).toBe("3100");
  });

  it("adds type filter and maps to Reservoir types", () => {
    const { query, params } = buildEventsQuery({
      collectionId: "0xtest",
      types: ["sale", "listing", "bid"],
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("a.type IN ($/types:csv/)");
    expect(params.types).toEqual(["sale", "ask", "bid"]);
  });

  it("maps listing_cancel to ask_cancel", () => {
    const { params } = buildEventsQuery({
      collectionId: "0xtest",
      types: ["listing_cancel"],
      limit: 10,
      offset: 0,
    });

    expect(params.types).toEqual(["ask_cancel"]);
  });

  it("adds time range filters", () => {
    const { query, params } = buildEventsQuery({
      collectionId: "0xtest",
      startTime: 1000000,
      endTime: 2000000,
      limit: 10,
      offset: 0,
    });

    expect(query).toContain("a.created_at >= to_timestamp($/startTime/)");
    expect(query).toContain("a.created_at <= to_timestamp($/endTime/)");
    expect(params.startTime).toBe(1000000);
    expect(params.endTime).toBe(2000000);
  });

  it("handles all filters combined", () => {
    const { query, params } = buildEventsQuery({
      collectionId: "0xtest",
      tokenId: "42",
      types: ["sale", "transfer"],
      startTime: 1000,
      endTime: 2000,
      limit: 50,
      offset: 10,
    });

    expect(query).toContain("a.collection_id = $/collectionId/");
    expect(query).toContain("a.token_id = $/tokenId/");
    expect(query).toContain("a.type IN ($/types:csv/)");
    expect(query).toContain("a.created_at >= to_timestamp($/startTime/)");
    expect(query).toContain("a.created_at <= to_timestamp($/endTime/)");
    expect(Object.keys(params)).toHaveLength(7);
  });

  it("omits optional filters when not provided", () => {
    const { query } = buildEventsQuery({
      collectionId: "0xtest",
      limit: 10,
      offset: 0,
    });

    expect(query).not.toContain("a.token_id = ");
    expect(query).not.toContain("type IN");
    expect(query).not.toContain("startTime");
    expect(query).not.toContain("endTime");
  });
});
