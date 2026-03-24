import { IDatabase } from "pg-promise";

export interface CollectionStatsRow {
  floor_sell_value: string | null;
  top_buy_value: string | null;
  on_sale_count: string | null;
  day1_volume: string | null;
  day7_volume: string | null;
  day30_volume: string | null;
  day1_volume_change: number | null;
  day7_volume_change: number | null;
  day30_volume_change: number | null;
  day1_floor_sell_value: string | null;
  day7_floor_sell_value: string | null;
  day30_floor_sell_value: string | null;
}

export async function queryCollectionStats(
  db: IDatabase<unknown>,
  collectionId: string
): Promise<CollectionStatsRow | null> {
  return db.oneOrNone(
    `
    SELECT
      c.floor_sell_value,
      c.top_buy_value,
      (SELECT COUNT(*) FROM orders o
        WHERE o.token_set_id LIKE 'token:' || $/collectionId/ || ':%'
          AND o.side = 'sell'
          AND o.fillability_status = 'fillable'
          AND o.approval_status = 'approved'
      ) AS on_sale_count,
      c.day1_volume,
      c.day7_volume,
      c.day30_volume,
      c.day1_volume_change,
      c.day7_volume_change,
      c.day30_volume_change,
      c.day1_floor_sell_value,
      c.day7_floor_sell_value,
      c.day30_floor_sell_value
    FROM collections c
    WHERE c.id = $/collectionId/
    LIMIT 1
    `,
    { collectionId }
  );
}

export interface LastSaleRow {
  price: string;
  timestamp: number;
}

export async function queryLastSale(
  db: IDatabase<unknown>,
  collectionId: string
): Promise<LastSaleRow | null> {
  return db.oneOrNone(
    `
    SELECT
      fe.price,
      extract(epoch from fe.created_at) AS timestamp
    FROM fill_events_2 fe
    JOIN tokens t ON fe.contract = t.contract AND fe.token_id = t.token_id
    WHERE t.collection_id = $/collectionId/
    ORDER BY fe.created_at DESC
    LIMIT 1
    `,
    { collectionId }
  );
}
