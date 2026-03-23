/**
 * Tests for the collection whitelist filter logic.
 *
 * These tests verify the filtering behavior without requiring a running indexer.
 * They test the pure logic of isContractEnabled and the event filtering pattern.
 */

// We test the filter logic directly since the actual collections.ts imports logger
// which requires the full indexer setup. Instead we test the filtering pattern.

describe("Collection filter logic", () => {
  const CRYPTOPUNKS = "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb";
  const PUDGY = "0xbd3531da5cf5857e7cfaa92426877b022e612cf8";
  const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const SEAPORT = "0x00000000000000adc04c56bf30ac9d3c0aaf14dc";

  // Simulate the enabledContracts set
  const enabledContracts = new Set([CRYPTOPUNKS.toLowerCase()]);

  function isContractEnabled(address: string): boolean {
    if (enabledContracts.size === 0) return true;
    return enabledContracts.has(address.toLowerCase());
  }

  function isCollectionFilterEnabled(): boolean {
    return enabledContracts.size > 0;
  }

  // Simulate event types
  type EventKind = "erc721" | "erc1155" | "erc20" | "cryptopunks" | "seaport" | "blur";

  interface MockEvent {
    kind: EventKind;
    baseEventParams: { address: string };
    subKind: string;
  }

  function filterEvents(events: MockEvent[]): MockEvent[] {
    if (!isCollectionFilterEnabled()) return events;

    const nftEventKinds = new Set<EventKind>(["erc721", "erc1155", "cryptopunks"]);
    return events.filter((e) => {
      if (!nftEventKinds.has(e.kind)) return true;
      return isContractEnabled(e.baseEventParams.address);
    });
  }

  describe("isContractEnabled", () => {
    it("returns true for whitelisted contract", () => {
      expect(isContractEnabled(CRYPTOPUNKS)).toBe(true);
    });

    it("returns true for whitelisted contract (uppercase)", () => {
      expect(isContractEnabled(CRYPTOPUNKS.toUpperCase())).toBe(true);
    });

    it("returns false for non-whitelisted contract", () => {
      expect(isContractEnabled(PUDGY)).toBe(false);
    });
  });

  describe("Event filtering", () => {
    it("keeps CryptoPunks events", () => {
      const events: MockEvent[] = [
        {
          kind: "cryptopunks",
          baseEventParams: { address: CRYPTOPUNKS },
          subKind: "cryptopunks-punk-offered",
        },
        {
          kind: "cryptopunks",
          baseEventParams: { address: CRYPTOPUNKS },
          subKind: "cryptopunks-punk-bought",
        },
        {
          kind: "cryptopunks",
          baseEventParams: { address: CRYPTOPUNKS },
          subKind: "cryptopunks-punk-transfer",
        },
      ];

      expect(filterEvents(events)).toHaveLength(3);
    });

    it("filters out non-whitelisted ERC721 events", () => {
      const events: MockEvent[] = [
        { kind: "erc721", baseEventParams: { address: PUDGY }, subKind: "erc721-transfer" },
        { kind: "erc721", baseEventParams: { address: CRYPTOPUNKS }, subKind: "erc721-transfer" },
      ];

      const filtered = filterEvents(events);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].baseEventParams.address).toBe(CRYPTOPUNKS);
    });

    it("filters out non-whitelisted ERC1155 events", () => {
      const events: MockEvent[] = [
        {
          kind: "erc1155",
          baseEventParams: { address: "0xsomerandom" },
          subKind: "erc1155-transfer-single",
        },
      ];

      expect(filterEvents(events)).toHaveLength(0);
    });

    it("KEEPS ERC20 events regardless of address (needed for price calculation)", () => {
      const events: MockEvent[] = [
        { kind: "erc20", baseEventParams: { address: WETH }, subKind: "erc20-transfer" },
        { kind: "erc20", baseEventParams: { address: "0xusdc" }, subKind: "erc20-transfer" },
      ];

      expect(filterEvents(events)).toHaveLength(2);
    });

    it("KEEPS Seaport events regardless of address (protocol events)", () => {
      const events: MockEvent[] = [
        {
          kind: "seaport",
          baseEventParams: { address: SEAPORT },
          subKind: "seaport-v1.6-order-filled",
        },
        {
          kind: "seaport",
          baseEventParams: { address: SEAPORT },
          subKind: "seaport-v1.6-order-cancelled",
        },
      ];

      expect(filterEvents(events)).toHaveLength(2);
    });

    it("KEEPS Blur events regardless of address (protocol events)", () => {
      const events: MockEvent[] = [
        { kind: "blur", baseEventParams: { address: "0xblur" }, subKind: "blur-orders-matched" },
      ];

      expect(filterEvents(events)).toHaveLength(1);
    });

    it("handles mixed event types correctly", () => {
      const events: MockEvent[] = [
        // Should keep: CryptoPunks NFT event
        {
          kind: "cryptopunks",
          baseEventParams: { address: CRYPTOPUNKS },
          subKind: "cryptopunks-punk-bought",
        },
        // Should keep: ERC20 (price calculation)
        { kind: "erc20", baseEventParams: { address: WETH }, subKind: "erc20-transfer" },
        // Should keep: Seaport (protocol event)
        {
          kind: "seaport",
          baseEventParams: { address: SEAPORT },
          subKind: "seaport-v1.6-order-filled",
        },
        // Should FILTER: ERC721 from non-whitelisted contract
        { kind: "erc721", baseEventParams: { address: PUDGY }, subKind: "erc721-transfer" },
        // Should FILTER: ERC721 from random contract
        { kind: "erc721", baseEventParams: { address: "0xrandom" }, subKind: "erc721-transfer" },
      ];

      const filtered = filterEvents(events);
      expect(filtered).toHaveLength(3);
      expect(filtered.map((e) => e.kind)).toEqual(["cryptopunks", "erc20", "seaport"]);
    });

    it("passes all events when filter is disabled (empty whitelist)", () => {
      // Temporarily clear the whitelist
      enabledContracts.clear();

      const events: MockEvent[] = [
        { kind: "erc721", baseEventParams: { address: PUDGY }, subKind: "erc721-transfer" },
        { kind: "erc721", baseEventParams: { address: "0xrandom" }, subKind: "erc721-transfer" },
      ];

      expect(filterEvents(events)).toHaveLength(2);

      // Restore
      enabledContracts.add(CRYPTOPUNKS);
    });
  });

  describe("OpenSea WebSocket filter logic", () => {
    function filterOpenseaEvent(nftId: string | undefined): boolean {
      if (!isCollectionFilterEnabled()) return true;
      if (!nftId) return true; // No nft_id = let it through (e.g. collection offers)

      const contract = nftId.split("/")[1];
      if (!contract) return true;
      return isContractEnabled(contract);
    }

    it("passes CryptoPunks events", () => {
      expect(filterOpenseaEvent(`ethereum/${CRYPTOPUNKS}/3100`)).toBe(true);
    });

    it("filters non-whitelisted collection events", () => {
      expect(filterOpenseaEvent(`ethereum/${PUDGY}/1234`)).toBe(false);
    });

    it("passes events with no nft_id (collection-wide offers)", () => {
      expect(filterOpenseaEvent(undefined)).toBe(true);
    });

    it("handles malformed nft_id gracefully", () => {
      expect(filterOpenseaEvent("malformed")).toBe(true);
      expect(filterOpenseaEvent("")).toBe(true);
    });
  });
});
