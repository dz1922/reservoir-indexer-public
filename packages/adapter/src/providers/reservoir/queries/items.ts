import { IDatabase } from "pg-promise";

export interface TokenRow {
  contract: Buffer;
  token_id: string;
  name: string | null;
  image: string | null;
  collection_id: string;
  metadata: Record<string, unknown> | null;
}

export const getTokenQuery = `
  SELECT
    t.contract,
    t.token_id,
    t.name,
    t.image,
    t.collection_id,
    t.metadata
  FROM tokens t
  WHERE t.collection_id = $/collectionId/
    AND t.token_id = $/tokenId/
  LIMIT 1
`;

export const getTokensQuery = `
  SELECT
    t.contract,
    t.token_id,
    t.name,
    t.image,
    t.collection_id,
    t.metadata
  FROM tokens t
  WHERE t.collection_id = $/collectionId/
  ORDER BY t.token_id::NUMERIC ASC
  LIMIT $/limit/
  OFFSET $/offset/
`;

export async function queryToken(
  db: IDatabase<unknown>,
  collectionId: string,
  tokenId: string
): Promise<TokenRow | null> {
  return db.oneOrNone(getTokenQuery, { collectionId, tokenId });
}

export async function queryTokens(
  db: IDatabase<unknown>,
  collectionId: string,
  limit: number,
  offset: number
): Promise<TokenRow[]> {
  return db.manyOrNone(getTokensQuery, { collectionId, limit, offset });
}
