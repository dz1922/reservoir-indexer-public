export interface Price {
  amount: string;
  currency: string;
  usdAmount?: string;
}

export interface Item {
  id: string;
  collection: string;
  tokenId: string;
  name?: string;
  image?: string;
  metadata: Record<string, unknown>;
}

export type MarketEventType =
  | "sale"
  | "listing"
  | "bid"
  | "listing_cancel"
  | "bid_cancel"
  | "transfer"
  | "mint";

export interface MarketEvent {
  type: MarketEventType;
  item: { collection: string; tokenId: string };
  from: string;
  to?: string;
  price?: Price;
  timestamp: number;
  txHash?: string;
  marketplace?: string;
}

export interface CollectionInfo {
  id: string;
  name: string;
  contract: string;
  image?: string;
  tokenCount?: number;
  enabled: boolean;
}

export interface TimeRangeStats {
  "1d": number | null;
  "7d": number | null;
  "30d": number | null;
}

export interface CollectionStats {
  floorAsk: Price | null;
  topBid: Price | null;
  lastSale: { price: Price; timestamp: number } | null;
  onSaleCount: number;
  volume: TimeRangeStats;
  volumeChange: TimeRangeStats;
  floorSale: TimeRangeStats;
  floorSaleChange: TimeRangeStats;
}

export interface PaginationOpts {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface EventFilterOpts extends PaginationOpts {
  type?: MarketEventType | MarketEventType[];
  tokenId?: string;
  startTime?: number;
  endTime?: number;
}

export interface OrderFilterOpts extends PaginationOpts {
  tokenId?: string;
  sortBy?: "price" | "createdAt";
  sortDirection?: "asc" | "desc";
}
