# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Reservoir Indexer is a production-grade NFT indexing platform. It's a **Yarn Workspaces + Turbo monorepo** with four packages:

- **`packages/indexer`** — Core indexing service (Hapi.js API, PostgreSQL, Redis, RabbitMQ, Elasticsearch). This is where most development happens.
- **`packages/sdk`** — Smart contract SDK with 50+ NFT marketplace protocol integrations (Seaport, Blur, LooksRare, X2Y2, etc.). Published as `@reservoir0x/sdk`.
- **`packages/contracts`** — Hardhat Solidity smart contracts.
- **`packages/mint-interface`** — TypeScript minting interface definitions.

## Build & Run Commands

```bash
# Root-level (all packages)
yarn build                    # Build all packages via Turbo
yarn start                    # Start all packages
yarn lint-check               # ESLint check
yarn format-check             # Prettier check
yarn format                   # Prettier fix

# Indexer package (from packages/indexer/)
yarn build                    # Clean + compile TypeScript
yarn dev                      # Watch mode with auto-restart
yarn start                    # Run compiled indexer
yarn migrate                  # Run PostgreSQL migrations (node-pg-migrate)
yarn test                     # Run Jest tests (--no-watchman)
yarn cli                      # Run CLI utilities
yarn debug                    # Build + run with --inspect

# Contracts package (from packages/contracts/)
yarn compile                  # Compile Solidity
yarn test                     # Run contract tests
```

## Architecture

### Indexer Startup Flow
`index.ts` → loads env, runs DB migrations, sets up RabbitMQ → `setup.ts` → initializes all subsystems (jobs, websockets, pubsub, Kafka, API server).

### Key Subsystems

| Subsystem | Location | Purpose |
|-----------|----------|---------|
| API | `src/api/` | Hapi.js REST API with versioned endpoints, API key auth, rate limiting |
| Jobs | `src/jobs/` | 62+ BullMQ/RabbitMQ job types for async processing |
| Event Sync | `src/sync/events/` | Blockchain event indexing — 61+ data types, 59+ protocol handlers |
| Orderbook | `src/orderbook/` | Order management across multiple marketplace protocols |
| WebSockets | `src/websockets/` | Real-time feeds from OpenSea, Blur, pending txs |
| PubSub | `src/pubsub/` | Redis pub/sub for cross-pod coordination |
| Elasticsearch | `src/elasticsearch/` | Activity/event search indexing |
| Metadata | `src/metadata/` | NFT metadata fetching (46+ custom providers) |
| Models | `src/models/` | 52+ data model modules |
| Config | `src/config/index.ts` | Central config from env vars |
| Migrations | `src/migrations/` | 262+ PostgreSQL migration files |

### Database Connections (defined in `src/common/db.ts`)
- `edb` — External (API-facing, 50 connections, 10s timeout)
- `idb` — Internal (background jobs, 75 connections, 5m timeout)
- `redb` / `ridb` — Read replicas (optional)
- `hdb` — Health check (5 connections)

### Infrastructure Dependencies
PostgreSQL, Redis (multiple instances for cache/rate-limit/websocket/metrics), RabbitMQ, Elasticsearch (optional), Kafka (optional).

### Pod Deployment Roles (controlled by env flags)
- **API Pod**: `DO_BACKGROUND_WORK=0` — serves REST API only
- **Worker Pod**: `DO_BACKGROUND_WORK=1` — processes jobs
- **Master Pod**: `MASTER=1` — single instance per chain, subscribes to new blocks
- **ES Worker**: `DO_ELASTICSEARCH_WORK=1` — indexes to Elasticsearch
- **Kafka Consumer**: `DO_KAFKA_WORK=1` — processes Kafka streams

### Module Aliases
The indexer uses `module-alias` with aliases like `@/api`, `@/common`, `@/config`, `@/models`, `@/jobs`, `@/orderbook`, `@/events-sync`, etc. mapped in the root `package.json`.

## Environment Setup

Copy `packages/indexer/.env.example` to `.env`. Key mandatory vars:
- `CHAIN_ID` / `CHAIN_NAME` — target blockchain
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `RABBIT_HOSTNAME` / `RABBIT_USERNAME` / `RABBIT_PASSWORD`
- `BASE_NETWORK_HTTP_URL` / `BASE_NETWORK_WS_URL` — RPC provider
- `ADMIN_API_KEY`, `CIPHER_SECRET`, `FEE_RECIPIENT`

Set `LOCAL_TESTING=1` to disable external service dependencies during development.

## Git Workflow

- Do NOT push directly; all git commits go through PRs.
- Commit messages follow Angular convention (enforced by commitlint + husky).
