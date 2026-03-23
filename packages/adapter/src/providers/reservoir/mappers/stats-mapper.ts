import { CollectionStats, Price } from "../../../types";
import { CollectionStatsRow, LastSaleRow } from "../queries/stats";

function toEthPrice(weiValue: string | null): Price | null {
  if (!weiValue) return null;
  const eth = (Number(weiValue) / 1e18).toString();
  return { amount: eth, currency: "ETH" };
}

export function mapStatsRow(
  row: CollectionStatsRow,
  lastSale: LastSaleRow | null
): CollectionStats {
  return {
    floorAsk: toEthPrice(row.floor_sell_value),
    topBid: toEthPrice(row.top_buy_value),
    lastSale: lastSale
      ? {
          price: {
            amount: (Number(lastSale.price) / 1e18).toString(),
            currency: "ETH",
          },
          timestamp: Math.floor(Number(lastSale.timestamp)),
        }
      : null,
    onSaleCount: Number(row.on_sale_count ?? 0),
    volume: {
      "1d": row.day1_volume ? Number(row.day1_volume) / 1e18 : null,
      "7d": row.day7_volume ? Number(row.day7_volume) / 1e18 : null,
      "30d": row.day30_volume ? Number(row.day30_volume) / 1e18 : null,
    },
    volumeChange: {
      "1d": row.day1_volume_change,
      "7d": row.day7_volume_change,
      "30d": row.day30_volume_change,
    },
    floorSale: {
      "1d": row.day1_floor_sell_value ? Number(row.day1_floor_sell_value) / 1e18 : null,
      "7d": row.day7_floor_sell_value ? Number(row.day7_floor_sell_value) / 1e18 : null,
      "30d": row.day30_floor_sell_value ? Number(row.day30_floor_sell_value) / 1e18 : null,
    },
    floorSaleChange: {
      "1d": null,
      "7d": null,
      "30d": null,
    },
  };
}
