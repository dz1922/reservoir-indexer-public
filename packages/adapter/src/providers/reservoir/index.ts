import pgPromise from "pg-promise";

import { DataProvider, Order } from "../data-provider";
import {
  Item,
  MarketEvent,
  CollectionInfo,
  CollectionStats,
  Price,
  PaginationOpts,
  EventFilterOpts,
  OrderFilterOpts,
} from "../../types";
import { queryToken, queryTokens } from "./queries/items";
import { queryEvents } from "./queries/events";
import { queryListings, queryBids } from "./queries/orders";
import { queryCollectionStats, queryLastSale } from "./queries/stats";
import { mapTokenToItem, fromBuffer } from "./mappers/item-mapper";
import { mapRowToEvent } from "./mappers/event-mapper";
import { mapStatsRow } from "./mappers/stats-mapper";

const pgp = pgPromise();

export interface ReservoirProviderConfig {
  databaseUrl: string;
  collections: CollectionInfo[];
}

export class ReservoirDataProvider implements DataProvider {
  readonly name = "reservoir";
  private db: pgPromise.IDatabase<unknown>;
  private collections: CollectionInfo[];

  constructor(config: ReservoirProviderConfig) {
    this.db = pgp(config.databaseUrl);
    this.collections = config.collections;
  }

  // Reservoir stores collection IDs in lowercase; normalize all inputs
  private normalizeCollection(collection: string): string {
    return collection.toLowerCase();
  }

  async getItem(collection: string, tokenId: string): Promise<Item | null> {
    collection = this.normalizeCollection(collection);
    const row = await queryToken(this.db, collection, tokenId);
    return row ? mapTokenToItem(row) : null;
  }

  async getItems(collection: string, opts?: PaginationOpts): Promise<Item[]> {
    collection = this.normalizeCollection(collection);
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    const rows = await queryTokens(this.db, collection, limit, offset);
    return rows.map(mapTokenToItem);
  }

  async getEvents(collection: string, opts?: EventFilterOpts): Promise<MarketEvent[]> {
    collection = this.normalizeCollection(collection);
    const types = opts?.type ? (Array.isArray(opts.type) ? opts.type : [opts.type]) : undefined;

    const rows = await queryEvents(this.db, {
      collectionId: collection,
      tokenId: opts?.tokenId,
      types,
      startTime: opts?.startTime,
      endTime: opts?.endTime,
      limit: opts?.limit ?? 20,
      offset: opts?.offset ?? 0,
    });

    return rows.map(mapRowToEvent);
  }

  async getListings(collection: string, opts?: OrderFilterOpts): Promise<Order[]> {
    collection = this.normalizeCollection(collection);
    const rows = await queryListings(this.db, collection, {
      tokenId: opts?.tokenId,
      limit: opts?.limit ?? 20,
      offset: opts?.offset ?? 0,
      sortDirection: opts?.sortDirection ?? "asc",
    });

    return rows.map((row) => this.mapOrderRow(row, collection));
  }

  async getBids(collection: string, opts?: OrderFilterOpts): Promise<Order[]> {
    collection = this.normalizeCollection(collection);
    const rows = await queryBids(this.db, collection, {
      tokenId: opts?.tokenId,
      limit: opts?.limit ?? 20,
      offset: opts?.offset ?? 0,
      sortDirection: opts?.sortDirection ?? "desc",
    });

    return rows.map((row) => this.mapOrderRow(row, collection));
  }

  async getFloorPrice(collection: string): Promise<Price | null> {
    collection = this.normalizeCollection(collection);
    const stats = await this.getCollectionStats(collection);
    return stats?.floorAsk ?? null;
  }

  async getCollectionStats(collection: string): Promise<CollectionStats | null> {
    collection = this.normalizeCollection(collection);
    const [statsRow, lastSaleRow] = await Promise.all([
      queryCollectionStats(this.db, collection),
      queryLastSale(this.db, collection),
    ]);

    if (!statsRow) return null;
    return mapStatsRow(statsRow, lastSaleRow);
  }

  async getSupportedCollections(): Promise<CollectionInfo[]> {
    return this.collections.filter((c) => c.enabled);
  }

  private mapOrderRow(
    row: {
      id: string;
      side: string;
      maker: Buffer;
      taker: Buffer | null;
      price: string;
      currency: Buffer;
      token_set_id: string;
      source_id_int: number | null;
      valid_between: string;
      created_at: string;
    },
    collection: string
  ): Order {
    const tokenId = row.token_set_id.startsWith("token:")
      ? row.token_set_id.split(":").pop()
      : undefined;

    let validFrom: number | undefined;
    let validUntil: number | undefined;
    try {
      const parsed = JSON.parse(row.valid_between.replace("infinity", "null"));
      validFrom = parsed[0] ? Math.floor(new Date(parsed[0]).getTime() / 1000) : undefined;
      validUntil = parsed[1] ? Math.floor(new Date(parsed[1]).getTime() / 1000) : undefined;
    } catch {
      // skip parsing errors
    }

    return {
      id: row.id,
      side: row.side === "sell" ? "listing" : "bid",
      maker: fromBuffer(row.maker),
      taker: row.taker ? fromBuffer(row.taker) : undefined,
      price: {
        amount: (Number(row.price) / 1e18).toString(),
        currency: fromBuffer(row.currency),
      },
      tokenId,
      collection,
      validFrom,
      validUntil,
      createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
    };
  }
}
