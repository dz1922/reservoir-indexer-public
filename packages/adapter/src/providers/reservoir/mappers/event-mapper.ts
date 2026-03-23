import { MarketEvent, MarketEventType } from "../../../types";
import { EventRow } from "../queries/events";
import { fromBuffer } from "./item-mapper";

const RESERVOIR_TYPE_MAP: Record<string, MarketEventType> = {
  sale: "sale",
  ask: "listing",
  bid: "bid",
  ask_cancel: "listing_cancel",
  bid_cancel: "bid_cancel",
  transfer: "transfer",
  mint: "mint",
};

export function mapRowToEvent(row: EventRow): MarketEvent {
  return {
    type: RESERVOIR_TYPE_MAP[row.type] ?? (row.type as MarketEventType),
    item: {
      collection: row.collection_id,
      tokenId: row.token_id,
    },
    from: fromBuffer(row.from_address),
    to: row.to_address ? fromBuffer(row.to_address) : undefined,
    price:
      row.price != null
        ? {
            amount: row.price,
            currency: row.currency ? fromBuffer(row.currency) : "ETH",
            usdAmount: row.usd_price ?? undefined,
          }
        : undefined,
    timestamp: Math.floor(Number(row.timestamp)),
    txHash: row.tx_hash ? fromBuffer(row.tx_hash) : undefined,
  };
}
