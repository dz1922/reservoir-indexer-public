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

// Build individual queries per event type against the actual Reservoir tables,
// then UNION ALL them together. This avoids depending on the `activities` table
// which requires async job population.

function buildSalesQuery(
  collectionId: string,
  tokenId?: string
): { sql: string; needsToken: boolean } {
  const tokenFilter = tokenId ? "AND fe.token_id = $/tokenId/" : "";
  return {
    sql: `
      SELECT
        'sale' AS type,
        fe.contract,
        fe.token_id::text AS token_id,
        t.collection_id,
        fe.maker AS from_address,
        fe.taker AS to_address,
        fe.price::text AS price,
        fe.currency,
        fe.usd_price::text AS usd_price,
        fe.timestamp,
        fe.tx_hash,
        fe.order_source_id_int
      FROM fill_events_2 fe
      JOIN tokens t ON fe.contract = t.contract AND fe.token_id = t.token_id
      WHERE t.collection_id = $/collectionId/
        AND fe.is_deleted = 0
        ${tokenFilter}
    `,
    needsToken: !!tokenId,
  };
}

function buildTransfersQuery(
  collectionId: string,
  tokenId?: string
): { sql: string; needsToken: boolean } {
  const tokenFilter = tokenId ? "AND nte.token_id = $/tokenId/" : "";
  return {
    sql: `
      SELECT
        CASE WHEN nte."from" = '\\x0000000000000000000000000000000000000000' THEN 'mint' ELSE 'transfer' END AS type,
        nte.address AS contract,
        nte.token_id::text AS token_id,
        t.collection_id,
        nte."from" AS from_address,
        nte."to" AS to_address,
        NULL AS price,
        NULL AS currency,
        NULL AS usd_price,
        nte.timestamp,
        nte.tx_hash,
        NULL::int AS order_source_id_int
      FROM nft_transfer_events nte
      JOIN tokens t ON nte.address = t.contract AND nte.token_id = t.token_id
      WHERE t.collection_id = $/collectionId/
        AND nte.is_deleted = 0
        ${tokenFilter}
    `,
    needsToken: !!tokenId,
  };
}

function buildListingsQuery(
  collectionId: string,
  tokenId?: string
): { sql: string; needsToken: boolean } {
  const tokenFilter = tokenId
    ? "AND o.token_set_id = 'token:' || $/collectionId/ || ':' || $/tokenId/"
    : "AND o.token_set_id LIKE 'token:' || $/collectionId/ || ':%'";
  return {
    sql: `
      SELECT
        CASE WHEN o.side = 'sell' THEN 'listing' ELSE 'bid' END AS type,
        o.contract,
        SPLIT_PART(o.token_set_id, ':', 3) AS token_id,
        $/collectionId/ AS collection_id,
        o.maker AS from_address,
        o.taker AS to_address,
        o.price::text AS price,
        o.currency,
        NULL::text AS usd_price,
        extract(epoch from o.created_at)::int AS timestamp,
        NULL::bytea AS tx_hash,
        o.source_id_int AS order_source_id_int
      FROM orders o
      WHERE o.contract = $/contractBytes/
        ${tokenFilter}
        AND o.fillability_status = 'fillable'
        AND o.approval_status = 'approved'
    `,
    needsToken: !!tokenId,
  };
}

const TYPE_TO_SOURCES: Record<MarketEventType, string[]> = {
  sale: ["sales"],
  transfer: ["transfers"],
  mint: ["transfers"],
  listing: ["listings"],
  bid: ["listings"],
  listing_cancel: [],
  bid_cancel: [],
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
  const requestedTypes = opts.types ?? ["sale", "transfer", "mint", "listing", "bid"];

  const sources = new Set<string>();
  for (const t of requestedTypes) {
    for (const s of TYPE_TO_SOURCES[t] ?? []) {
      sources.add(s);
    }
  }

  const subQueries: string[] = [];

  if (sources.has("sales")) {
    subQueries.push(buildSalesQuery(opts.collectionId, opts.tokenId).sql);
  }

  if (sources.has("transfers")) {
    subQueries.push(buildTransfersQuery(opts.collectionId, opts.tokenId).sql);
  }

  if (sources.has("listings")) {
    subQueries.push(buildListingsQuery(opts.collectionId, opts.tokenId).sql);
  }

  if (subQueries.length === 0) {
    return {
      query: "SELECT NULL WHERE FALSE",
      params: {},
    };
  }

  const timeFilter: string[] = [];
  if (opts.startTime) {
    timeFilter.push("AND combined.timestamp >= $/startTime/");
  }
  if (opts.endTime) {
    timeFilter.push("AND combined.timestamp <= $/endTime/");
  }

  // Filter by requested types
  const typeValues = requestedTypes.map((t) => `'${t}'`).join(",");

  const query = `
    SELECT * FROM (
      ${subQueries.join("\n      UNION ALL\n      ")}
    ) combined
    WHERE combined.type IN (${typeValues})
    ${timeFilter.join("\n    ")}
    ORDER BY combined.timestamp DESC
    LIMIT $/limit/
    OFFSET $/offset/
  `;

  const params: Record<string, unknown> = {
    collectionId: opts.collectionId,
    contractBytes: Buffer.from(opts.collectionId.replace("0x", ""), "hex"),
    limit: opts.limit,
    offset: opts.offset,
  };

  if (opts.tokenId) {
    params.tokenId = opts.tokenId;
  }
  if (opts.startTime) {
    params.startTime = opts.startTime;
  }
  if (opts.endTime) {
    params.endTime = opts.endTime;
  }

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
