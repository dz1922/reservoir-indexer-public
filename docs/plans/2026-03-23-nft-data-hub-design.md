# NFT Data Hub - Design Document

## Overview

An AI-Native NFT market data platform built on top of the Reservoir Indexer. Provides MCP + LLM-friendly REST API for NFT market data. Collections are onboarded incrementally, starting with CryptoPunks.

## Key Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Code organization | Fork Reservoir repo, add new packages | Inherit data integrity logic (reorg detection, block gap filling, order validation) |
| External deps | Alchemy RPC + OpenSea API | Minimal deps; OpenSea is required for off-chain orders + metadata |
| Middleware | PostgreSQL + Redis + RabbitMQ | Keep RabbitMQ as-is to avoid rewriting 170+ job queues; disable Kafka + Elasticsearch via env flags |
| Historical data | Realtime only in Phase 1, retain backfill capability | Toggle `DO_EVENTS_SYNC_BACKFILL` when needed |
| Collection ID | Contract address (aligned with Reservoir internal `collection_id`) | Zero conversion; shared contracts auto-split by Reservoir extend handlers |
| API style | MCP (aggregated, fewer round trips) + REST (fine-grained, flexible) | Two layers serve different use cases |

## Architecture

```text
packages/
├── indexer/          # Reservoir data layer (config-trimmed, code untouched)
├── sdk/              # Reservoir protocol SDK (indexer dependency)
├── mint-interface/   # Minting type definitions (indexer dependency)
├── adapter/          # [NEW] Unified data adapter layer
└── api-gateway/      # [NEW] AI-Native API layer
```

### Data Flow

```text
Alchemy RPC ──→ Reservoir Indexer ──→ PostgreSQL ←── Adapter ←── API Gateway ──→ Client
                     ↑                                              ├── REST API
OpenSea API ─────────┘                                              ├── MCP Server
  (WebSocket: off-chain orders)                                     └── WebSocket (Phase 2)
  (REST: metadata)
```

### Infrastructure

```text
┌──────────────────────────────────────────────┐
│              EC2 / Local                     │
│                                              │
│  ┌──────────────┐  ┌────────────────┐        │
│  │  Reservoir    │  │  API Gateway   │        │
│  │  Indexer      │  │  REST + MCP    │        │
│  └──────┬───────┘  └───────┬────────┘        │
│         ▼                  ▼                 │
│  ┌────────────────────────────────────────┐  │
│  │         PostgreSQL                     │  │
│  ├────────────────────────────────────────┤  │
│  │         Redis                          │  │
│  ├────────────────────────────────────────┤  │
│  │         RabbitMQ                       │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## Disabled Components (via environment flags, zero code changes)

| Component | Original purpose | Flag | Impact |
| --------- | ---------------- | ---- | ------ |
| Kafka | CDC data stream | `DO_KAFKA_WORK=0` | None -- all data still in PostgreSQL |
| Elasticsearch | Full-text search for activities | `DO_ELASTICSEARCH_WORK=0` | None -- activities remain queryable in PostgreSQL |

## Collection Configuration

```json
[
  {
    "contract": "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
    "enabled": true
  },
  {
    "contract": "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
    "enabled": false
  }
]
```

- Only a contract address is needed; collection splitting is handled automatically by Reservoir internals
- Shared contracts (Art Blocks by million-segment tokenId range, SuperRare by creator address) have built-in extend handlers
- Event sync only processes events from `enabled: true` contracts, saving RPC calls
- Adding a new collection requires only a config change (unless a new shared-contract type needs a custom extend handler)

## Adapter Layer

### Unified Data Model

```typescript
interface Item {
  id: string;                    // "cryptopunks:3100"
  collection: string;            // collection_id from Reservoir
  tokenId: string;
  name?: string;
  image?: string;
  metadata: Record<string, any>; // traits/attributes
}

interface MarketEvent {
  type: "sale" | "listing" | "bid" | "listing_cancel" | "bid_cancel" | "transfer" | "mint";
  item: { collection: string; tokenId: string };
  from: string;
  to?: string;
  price?: { amount: string; currency: string; usdAmount?: string };
  timestamp: number;
  txHash?: string;
  marketplace?: string;
}

interface CollectionStats {
  floorAsk: Price | null;
  topBid: Price | null;
  lastSale: { price: Price; timestamp: number } | null;
  onSaleCount: number;
  volume: { "1d": number; "7d": number; "30d": number };
  volumeChange: { "1d": number; "7d": number; "30d": number };
  floorSale: { "1d": number; "7d": number; "30d": number };
  floorSaleChange: { "1d": number; "7d": number; "30d": number };
}

interface DataProvider {
  name: string;
  getItem(collection: string, tokenId: string): Promise<Item>;
  getItems(collection: string, opts?: PaginationOpts): Promise<Item[]>;
  getEvents(collection: string, opts?: EventFilterOpts): Promise<MarketEvent[]>;
  getFloorPrice(collection: string): Promise<Price | null>;
  getCollectionStats(collection: string): Promise<CollectionStats>;
  getSupportedCollections(): Promise<CollectionInfo[]>;
}
```

- No `allTime` aggregation (incomplete historical data)
- `ownerCount` / `tokenCount` fetched on-demand from OpenSea API
- Reservoir adapter connects directly to PostgreSQL (shared DB, no HTTP overhead)

## API Gateway - REST API

LLM-friendly: every response includes a `description` and a `summary` field.

```text
# Collection
GET /api/v1/collections                          # Supported collection list
GET /api/v1/collections/:collection              # Collection details + stats

# Token
GET /api/v1/collections/:collection/tokens       # Token list (paginated)
GET /api/v1/collections/:collection/tokens/:id   # Single token details + metadata

# Orders
GET /api/v1/collections/:collection/listings     # Collection listings
GET /api/v1/collections/:collection/bids         # Collection bids
GET /api/v1/tokens/:collection/:id/listings      # Token listings
GET /api/v1/tokens/:collection/:id/bids          # Token bids

# Events
GET /api/v1/collections/:collection/events       # Collection event stream (?type=sale,transfer)
GET /api/v1/tokens/:collection/:id/events        # Token event stream
```

### Response Format

```json
{
  "description": "Recent 5 sales for CryptoPunks collection",
  "data": [],
  "summary": "CryptoPunk #3100 sold for 75 ETH ($142,500) 2 hours ago."
}
```

## API Gateway - MCP Server

5 tools optimized for AI agent call efficiency (fewer round trips):

```typescript
// Core queries (aggregated -- one call answers one question)
get_item({
  collection, tokenId,
  include?: ["metadata", "listings", "bids", "recent_sales"]
})

get_collection({
  collection,
  include?: ["stats", "floor_listings", "top_bids"]
})

get_events({
  collection,
  tokenId?,
  type?,   // sale | listing | bid | transfer | cancel | mint
  limit?
})

// Auxiliary
get_supported_collections()

get_items_batch({
  items: [{ collection, tokenId }, ...],  // max 20
  include?: ["metadata", "listings", "bids"]
})
```

## Implementation Plan - Phase 1 (CryptoPunks MVP)

### Step 1: Environment Configuration (Risk: LOW)

Disable unused subsystems via environment variables. Zero code changes.

- Set `DO_KAFKA_WORK=0`, `DO_KAFKA_STREAM_WORK=0`
- Set `DO_ELASTICSEARCH_WORK=0`
- Set `DO_EVENTS_SYNC_BACKFILL=0`
- Configure RabbitMQ connection to local Docker container

### Step 2: Collection Whitelist Filter (Risk: MEDIUM)

Add contract-address-based filtering so the indexer only processes events for enabled collections.

**New files:**

- `config/collections.json` -- whitelist config
- `packages/indexer/src/config/collections.ts` -- config loader, exports `isContractEnabled()`

**Modified files:**

- `packages/indexer/src/sync/events/index.ts` -- filter logs by contract address after `getLogs()` call in `syncEvents()` and `syncEventsOnly()`
- `packages/indexer/src/websockets/opensea/index.ts` -- filter OpenSea WebSocket events by contract address before processing

**Important:** Do NOT filter ERC20 transfer events (e.g. WETH at `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`). These are emitted by payment token contracts, not NFT contracts, and are required for price calculation. The filter applies only to the `log.address` field matching NFT contract addresses.

### Step 3: Adapter Package (Risk: MEDIUM)

Create `packages/adapter/` with the unified data model and Reservoir PostgreSQL provider.

```text
packages/adapter/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types.ts                # Item, MarketEvent, CollectionStats, DataProvider
    ├── providers/
    │   ├── data-provider.ts    # DataProvider interface
    │   └── reservoir/
    │       ├── index.ts        # ReservoirDataProvider implementation
    │       ├── queries/        # SQL query builders
    │       │   ├── items.ts
    │       │   ├── events.ts
    │       │   ├── orders.ts
    │       │   └── stats.ts
    │       └── mappers/        # DB row to model mappers
    │           ├── item-mapper.ts
    │           ├── event-mapper.ts
    │           └── stats-mapper.ts
    └── collection-registry.ts  # Reads config/collections.json
```

Reference Reservoir's existing API endpoint handlers for battle-tested SQL patterns:

- `packages/indexer/src/api/endpoints/tokens/` -- token queries
- `packages/indexer/src/api/endpoints/collections/` -- collection stats queries
- `packages/indexer/src/api/endpoints/orders/` -- order queries
- `packages/indexer/src/api/endpoints/activities/` -- activity/event queries

Adapter connects to PostgreSQL via its own `pg-promise` instance using the shared `DATABASE_URL`.

### Step 4: API Gateway Package (Risk: MEDIUM)

Create `packages/api-gateway/` with REST API and MCP Server.

```text
packages/api-gateway/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                # Server entry point
    ├── rest/
    │   ├── routes/
    │   │   ├── collections.ts
    │   │   ├── tokens.ts
    │   │   ├── orders.ts
    │   │   └── events.ts
    │   └── middleware/
    │       ├── llm-response.ts # Wraps responses with description + summary
    │       └── error-handler.ts
    ├── mcp/
    │   ├── server.ts           # MCP server setup
    │   └── tools/
    │       ├── get-item.ts
    │       ├── get-collection.ts
    │       ├── get-events.ts
    │       ├── get-supported-collections.ts
    │       └── get-items-batch.ts
    └── utils/
        └── summary-generator.ts  # Template-based natural language summaries
```

MCP Server uses `@modelcontextprotocol/sdk`. Summary generation is template-based in Phase 1 (no LLM call needed).

### Step 5: Docker Compose (Risk: LOW)

```yaml
services:
  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"

  indexer:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - postgres
      - redis
      - rabbitmq
    env_file: .env

  api-gateway:
    build:
      context: .
      dockerfile: packages/api-gateway/Dockerfile
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"
    env_file: .env

volumes:
  pgdata:
```

### Step 6: Workspace Configuration (Risk: LOW)

- Verify `packages/*` glob in root `package.json` picks up new packages
- Add `packages/adapter` and `packages/api-gateway` to `turbo.json` pipeline
- Create `.env.example` with all required variables

## Risks and Mitigations

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| Collection filter drops required ERC20 events | HIGH | Filter only on NFT contract addresses; WETH and other payment tokens use different contract addresses |
| Adapter SQL queries mismatch Reservoir schema | MEDIUM | Use existing API endpoint handlers as reference; study migration files |
| OpenSea free API rate limiting | MEDIUM | CryptoPunks has only 10K tokens; cache metadata after initial fetch; low daily request volume |
| OpenSea WebSocket receives all events (bandwidth) | LOW | Simple filter before processing; CryptoPunks is a tiny fraction of total events |
| Alchemy RPC cost for realtime sync | LOW | Single collection = minimal block processing; only matching events are processed |

## Success Criteria

- [ ] Indexer starts and syncs CryptoPunks events in realtime (sales, listings, bids, transfers)
- [ ] OpenSea WebSocket captures CryptoPunks off-chain orders
- [ ] Events from non-whitelisted contracts are ignored
- [ ] REST API returns CryptoPunks collection stats, token details, listings, bids, events
- [ ] MCP Server responds to all 5 tool calls with correct data
- [ ] API responses include `description` and `summary` fields
- [ ] `docker compose up` brings up full stack and is functional

## Phased Rollout

### Phase 1: CryptoPunks MVP (current)

- Collection whitelist filter
- Realtime event sync (sale / listing / bid / transfer / mint / cancel)
- OpenSea metadata + off-chain order ingestion
- Adapter package (Reservoir PostgreSQL provider)
- API Gateway (REST + MCP)
- Docker Compose (PostgreSQL + Redis + RabbitMQ + Indexer + API Gateway)

### Phase 2: Expand

- Onboard more collections (Pudgy Penguins and other standard ERC721)
- WebSocket push (consume from Redis pub/sub, push to clients)
- Enable historical backfill on demand

### Phase 3: Advanced

- Shared contract collection support (Art Blocks, SuperRare)
- Virtual collections (cross-contract aggregation)
- Configurable extend handler registration (no code change for new shared contracts)
- Additional DataProviders (e.g. Pokemon cards or other non-NFT data sources)

### Future Optimization

- Replace RabbitMQ with BullMQ + Redis or in-process queue (reduce infrastructure)
- Upgrade Alchemy metadata provider from v2 to v3 API

## Environment Configuration

```bash
# Chain
CHAIN_ID=1
CHAIN_NAME=mainnet

# RPC
BASE_NETWORK_HTTP_URL=https://eth-mainnet.g.alchemy.com/v2/<ALCHEMY_KEY>
BASE_NETWORK_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/<ALCHEMY_KEY>

# Database
DATABASE_URL=postgresql://postgres:password@postgres:5432/nft_data_hub
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBIT_HOSTNAME=rabbitmq
RABBIT_USERNAME=guest
RABBIT_PASSWORD=guest
ASSERT_RABBIT_VHOST=1

# OpenSea
OPENSEA_API_KEY=<key>
METADATA_INDEXING_METHOD=opensea

# Feature Flags
CATCHUP=1
MASTER=1
DO_BACKGROUND_WORK=1
DO_WEBSOCKET_WORK=1
DO_EVENTS_SYNC_BACKFILL=0
DO_ELASTICSEARCH_WORK=0
DO_KAFKA_WORK=0
DO_KAFKA_STREAM_WORK=0
DO_WEBSOCKET_SERVER_WORK=0
LOCAL_TESTING=0
DISABLE_ORDERS=0

# Admin
ADMIN_API_KEY=<key>
CIPHER_SECRET=<32 bytes>
FEE_RECIPIENT=<address>
IMAGE_TAG=dev
```
