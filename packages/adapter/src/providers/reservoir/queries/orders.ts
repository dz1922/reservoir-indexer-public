import { IDatabase } from "pg-promise";

export interface OrderRow {
  id: string;
  side: string;
  maker: Buffer;
  taker: Buffer | null;
  price: string;
  currency: Buffer;
  currency_price: string;
  token_set_id: string;
  source_id_int: number | null;
  valid_between: string;
  created_at: string;
  token_id?: string;
  collection_id?: string;
}

export async function queryListings(
  db: IDatabase<unknown>,
  collectionId: string,
  opts: { tokenId?: string; limit: number; offset: number; sortDirection?: "asc" | "desc" }
): Promise<OrderRow[]> {
  const conditions = [
    "o.side = 'sell'",
    "o.fillability_status = 'fillable'",
    "o.approval_status = 'approved'",
  ];
  const params: Record<string, unknown> = {
    limit: opts.limit,
    offset: opts.offset,
  };

  if (opts.tokenId) {
    conditions.push("o.token_set_id = $/tokenSetId/");
    params.tokenSetId = `token:${collectionId}:${opts.tokenId}`;
  } else {
    conditions.push("o.token_set_id LIKE $/tokenSetPrefix/");
    params.tokenSetPrefix = `token:${collectionId}:%`;
  }

  const sortDir = opts.sortDirection === "desc" ? "DESC" : "ASC";

  return db.manyOrNone(
    `
    SELECT
      o.id,
      o.side,
      o.maker,
      o.taker,
      o.price,
      o.currency,
      o.currency_price,
      o.token_set_id,
      o.source_id_int,
      o.valid_between,
      o.created_at
    FROM orders o
    WHERE ${conditions.join(" AND ")}
    ORDER BY o.price ${sortDir}
    LIMIT $/limit/
    OFFSET $/offset/
    `,
    params
  );
}

export async function queryBids(
  db: IDatabase<unknown>,
  collectionId: string,
  opts: { tokenId?: string; limit: number; offset: number; sortDirection?: "asc" | "desc" }
): Promise<OrderRow[]> {
  const conditions = [
    "o.side = 'buy'",
    "o.fillability_status = 'fillable'",
    "o.approval_status = 'approved'",
  ];
  const params: Record<string, unknown> = {
    limit: opts.limit,
    offset: opts.offset,
  };

  if (opts.tokenId) {
    conditions.push("o.token_set_id = $/tokenSetId/");
    params.tokenSetId = `token:${collectionId}:${opts.tokenId}`;
  } else {
    conditions.push(
      "(o.token_set_id LIKE $/tokenSetPrefix/ OR o.token_set_id = $/collectionSetId/)"
    );
    params.tokenSetPrefix = `token:${collectionId}:%`;
    params.collectionSetId = `contract:${collectionId}`;
  }

  const sortDir = opts.sortDirection === "desc" ? "DESC" : "ASC";

  return db.manyOrNone(
    `
    SELECT
      o.id,
      o.side,
      o.maker,
      o.taker,
      o.price,
      o.currency,
      o.currency_price,
      o.token_set_id,
      o.source_id_int,
      o.valid_between,
      o.created_at
    FROM orders o
    WHERE ${conditions.join(" AND ")}
    ORDER BY o.price ${sortDir}
    LIMIT $/limit/
    OFFSET $/offset/
    `,
    params
  );
}
