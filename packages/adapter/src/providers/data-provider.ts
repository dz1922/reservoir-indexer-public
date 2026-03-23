import {
  Item,
  MarketEvent,
  CollectionInfo,
  CollectionStats,
  Price,
  PaginationOpts,
  EventFilterOpts,
  OrderFilterOpts,
} from "../types";

export interface Order {
  id: string;
  side: "listing" | "bid";
  maker: string;
  taker?: string;
  price: Price;
  tokenId?: string;
  collection: string;
  marketplace?: string;
  validFrom?: number;
  validUntil?: number;
  createdAt: number;
}

export interface DataProvider {
  readonly name: string;

  getItem(collection: string, tokenId: string): Promise<Item | null>;
  getItems(collection: string, opts?: PaginationOpts): Promise<Item[]>;

  getEvents(collection: string, opts?: EventFilterOpts): Promise<MarketEvent[]>;

  getListings(collection: string, opts?: OrderFilterOpts): Promise<Order[]>;
  getBids(collection: string, opts?: OrderFilterOpts): Promise<Order[]>;

  getFloorPrice(collection: string): Promise<Price | null>;
  getCollectionStats(collection: string): Promise<CollectionStats | null>;
  getSupportedCollections(): Promise<CollectionInfo[]>;
}
