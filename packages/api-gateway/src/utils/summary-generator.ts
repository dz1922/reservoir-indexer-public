import { MarketEvent, CollectionStats, Price } from "@nft-data-hub/adapter";
import { Order } from "@nft-data-hub/adapter";

function formatPrice(price: Price | null | undefined): string {
  if (!price) return "N/A";
  const usd = price.usdAmount ? ` ($${Number(price.usdAmount).toLocaleString()})` : "";
  return `${price.amount} ETH${usd}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function summarizeEvents(events: MarketEvent[], collection: string): string {
  if (events.length === 0) return `No recent events for ${collection}.`;

  const sales = events.filter((e) => e.type === "sale");
  const listings = events.filter((e) => e.type === "listing");

  const parts: string[] = [];

  if (sales.length > 0) {
    const latest = sales[0];
    parts.push(
      `Latest sale: token #${latest.item.tokenId} for ${formatPrice(latest.price)} ${timeAgo(
        latest.timestamp
      )}`
    );
  }

  if (listings.length > 0) {
    parts.push(`${listings.length} new listing(s)`);
  }

  parts.push(`${events.length} total events returned`);
  return parts.join(". ") + ".";
}

export function summarizeCollectionStats(stats: CollectionStats, collection: string): string {
  const parts: string[] = [];

  if (stats.floorAsk) {
    parts.push(`Floor: ${formatPrice(stats.floorAsk)}`);
  }

  if (stats.topBid) {
    parts.push(`Top bid: ${formatPrice(stats.topBid)}`);
  }

  parts.push(`${stats.onSaleCount} listed`);

  if (stats.volume["1d"] != null) {
    parts.push(`24h volume: ${stats.volume["1d"]?.toFixed(2)} ETH`);
  }

  return `${collection}: ${parts.join(", ")}.`;
}

export function summarizeListings(listings: Order[], collection: string): string {
  if (listings.length === 0) return `No active listings for ${collection}.`;

  const cheapest = listings[0];
  return `${listings.length} listing(s) for ${collection}. Cheapest: token #${
    cheapest.tokenId ?? "?"
  } at ${formatPrice(cheapest.price)}.`;
}

export function summarizeBids(bids: Order[], collection: string): string {
  if (bids.length === 0) return `No active bids for ${collection}.`;

  const highest = bids[0];
  return `${bids.length} bid(s) for ${collection}. Highest: ${formatPrice(
    highest.price
  )} on token #${highest.tokenId ?? "collection-wide"}.`;
}
