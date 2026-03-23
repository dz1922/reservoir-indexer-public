import { IDatabase } from "pg-promise";
import { MarketEventType } from "../../../types";

export interface EventRow {
  type: string;
  contract: Buffer;
  token_id: string;
  collection_id: string;
  from_address: Buffer;
  to_address: Buffer | null;
  price: string | null;
  currency: Buffer | null;
  usd_price: string | null;
  timestamp: number;
  tx_hash: Buffer | null;
  order_source_id_int: number | null;
}

const EVENT_TYPE_MAP: Record<MarketEventType, string> = {
  sale: "sale",
  listing: "ask",
  bid: "bid",
  listing_cancel: "ask_cancel",
  bid_cancel: "bid_cancel",
  transfer: "transfer",
  mint: "mint",
};

export function buildEventsQuery(opts: {
  collectionId: string;
  tokenId?: string;
  types?: MarketEventType[];
  startTime?: number;
  endTime?: number;
  limit: number;
  offset: number;
}): { query: string; params: Record<string, unknown> } {
  const conditions = ["a.collection_id = $/collectionId/"];
  const params: Record<string, unknown> = {
    collectionId: opts.collectionId,
    limit: opts.limit,
    offset: opts.offset,
  };

  if (opts.tokenId) {
    conditions.push("a.token_id = $/tokenId/");
    params.tokenId = opts.tokenId;
  }

  if (opts.types && opts.types.length > 0) {
    const mappedTypes = opts.types.map((t) => EVENT_TYPE_MAP[t]).filter(Boolean);
    conditions.push("a.type IN ($/types:csv/)");
    params.types = mappedTypes;
  }

  if (opts.startTime) {
    conditions.push("a.created_at >= to_timestamp($/startTime/)");
    params.startTime = opts.startTime;
  }

  if (opts.endTime) {
    conditions.push("a.created_at <= to_timestamp($/endTime/)");
    params.endTime = opts.endTime;
  }

  const query = `
    SELECT
      a.type,
      a.contract,
      a.token_id,
      a.collection_id,
      a.from AS from_address,
      a.to AS to_address,
      a.price,
      a.pricing_currency AS currency,
      a.pricing_usd_price AS usd_price,
      extract(epoch from a.created_at) AS timestamp,
      a.event_tx_hash AS tx_hash,
      a.order_source_id_int
    FROM activities a
    WHERE ${conditions.join(" AND ")}
    ORDER BY a.created_at DESC
    LIMIT $/limit/
    OFFSET $/offset/
  `;

  return { query, params };
}

export async function queryEvents(
  db: IDatabase<unknown>,
  opts: {
    collectionId: string;
    tokenId?: string;
    types?: MarketEventType[];
    startTime?: number;
    endTime?: number;
    limit: number;
    offset: number;
  }
): Promise<EventRow[]> {
  const { query, params } = buildEventsQuery(opts);
  return db.manyOrNone(query, params);
}
