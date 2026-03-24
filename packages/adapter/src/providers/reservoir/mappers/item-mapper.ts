import { Item } from "../../../types";
import { TokenRow } from "../queries/items";

export function fromBuffer(buffer: Buffer): string {
  return "0x" + buffer.toString("hex");
}

export function mapTokenToItem(row: TokenRow): Item {
  return {
    id: `${row.collection_id}:${row.token_id}`,
    collection: row.collection_id,
    tokenId: row.token_id,
    name: row.name ?? undefined,
    image: row.image ?? undefined,
    metadata: row.metadata ?? {},
  };
}
