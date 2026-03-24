# Digital Culture Data Layer — Vision & Strategy

## One-liner

**The data infrastructure that lets AI agents understand, analyze, and act on digital culture markets.**

## The Problem

Digital culture assets — NFTs, game items, virtual goods, physical collectibles, art — are traded across dozens of fragmented platforms. No single data layer exists that:

1. Aggregates and normalizes this data across asset types
2. Is designed for AI agents as the primary consumer (not humans clicking dashboards)
3. Provides processed, structured, contextual data (not just raw transactions)

The two best NFT data services (Reservoir, SimpleHash) shut down in 2025. What remains are raw data dumps with no intelligence layer. The market needs infrastructure, not another dashboard.

## Our Thesis

**Data infrastructure, not application.** We build the data layer. Others (including AI agents) build on top.

**AI-Native, not AI-added.** MCP is the primary interface. Every API response is designed to be consumed by an agent — self-describing, contextual, actionable. REST is the secondary interface for developers.

**Depth-first, then breadth.** Start with the deepest possible coverage of one asset class (CryptoPunks), prove the model works, then expand horizontally.

## Three Pillars

### 1. Data-Based Infrastructure Service

We are not a product. We are infrastructure.

- **Complete data**: Every transaction, every bid, every ownership change. No gaps.
- **Processed data**: Not raw events — structured histories, holder profiles, market depth, dormancy analysis.
- **Reliable data**: Reorg detection, block gap filling, wash trade flagging. Data integrity is non-negotiable.
- **Extensible data**: Adding a new asset class means adding a data adapter, not rebuilding the system.

### 2. AI-Native, Agent-Facing

The primary user of this service is not a human. It is an AI agent.

- **MCP-first**: Agents connect via Model Context Protocol. Every data query is a tool call.
- **Self-describing responses**: Every response includes what the data is, what it means, and what's notable about it.
- **Aggregated queries**: One tool call answers one question. An agent asking "is this Punk worth buying?" gets price history, comparable sales, bid depth, and holder profile in a single call — not 5 separate API hits.
- **No dashboard tax**: We don't build UIs. We don't build charts. The agent is the UI.

### 3. Depth-First Expansion

```
Phase 1: CryptoPunks (Crypto — NFTs)
   │      The perfect first dataset:
   │      - 100% on-chain, no external dependencies
   │      - 10 years of history, richest on-chain dataset
   │      - Highest cultural recognition
   │      - Small enough to be complete (10,000 items)
   │
Phase 2: Expand within NFTs
   │      Art Blocks, Autoglyphs, Pudgy Penguins...
   │      Same infrastructure, new data adapters
   │
Phase 3: Digital Collectibles
   │      Game items (CS2 skins, Fortnite items)
   │      Virtual goods, in-game assets
   │      New data source adapters (non-blockchain)
   │
Phase 4: Physical Collectibles & Art
          Trading cards (Pokémon, sports cards)
          Physical art with digital provenance
          Luxury goods with authentication
```

Each phase reuses the same core:
- Same unified data model (Item, Event, Market State, Wallet/Owner Profile)
- Same MCP tools (get_item, get_history, get_market_depth...)
- Same AI-native response format
- Different data source adapters

## Architecture (Simplified)

```
┌──────────────────────────────────────────────┐
│         AI Agents / LLM Applications         │
│     (Claude, GPT, custom agents, etc.)       │
└──────────────────┬───────────────────────────┘
                   │ MCP / REST
┌──────────────────┴───────────────────────────┐
│          API Layer (AI-Native)                │
│  • MCP Server (primary)                      │
│  • REST API (secondary)                      │
│  • Self-describing, contextual responses     │
├──────────────────────────────────────────────┤
│          Intelligence Layer                   │
│  • Holder profiling                          │
│  • Dormancy analysis                         │
│  • Wash trade detection                      │
│  • Market depth calculation                  │
│  • Provenance chain building                 │
├──────────────────────────────────────────────┤
│          Unified Data Model                   │
│  • Item (any collectible asset)              │
│  • Event (any market activity)               │
│  • Market State (any marketplace)            │
│  • Owner Profile (any holder/wallet)         │
├──────────────────────────────────────────────┤
│          Data Source Adapters                  │
│  ┌─────────┐ ┌─────────┐ ┌────────────────┐ │
│  │ Crypto   │ │ Gaming  │ │ Physical       │ │
│  │ (chain)  │ │ (APIs)  │ │ (marketplaces) │ │
│  └─────────┘ └─────────┘ └────────────────┘ │
└──────────────────────────────────────────────┘
```

## CryptoPunks — Why It's the Perfect First Scenario

| Reason | Detail |
| ------ | ------ |
| Data completeness | All data on-chain. No dependence on centralized APIs that can shut down. |
| Historical depth | 10 years of trading history. Richest on-chain dataset for any NFT. |
| Cultural significance | The most recognized NFT collection. Highest signal-to-noise for AI queries. |
| Complexity proves the model | 3+ contracts, built-in marketplace, wrapping/unwrapping, stash bids — if our system handles this, it handles anything. |
| Small scale, high value | Only 10,000 items. Complete indexing is feasible. Each item worth 20-100+ ETH. |
| Market gap | Reservoir shut down. No good CryptoPunks data service exists. Immediate demand. |

## What We Build for CryptoPunks (Phase 1)

Using the generic infrastructure, applied to CryptoPunks:

**Data collection** (5 contracts):
- Original marketplace events (sales, bids, transfers)
- Wrapped Punks events (ERC-721 trades on Seaport, Blur)
- CryptoPunks 721 events (official wrapper)
- Stash Factory events (bid management)
- CryptoPunks Data contract (on-chain attributes/images)
- Full historical backfill from 2017

**Intelligence layer**:
- Complete ownership chain for every Punk
- Holder profiling (accumulator, flipper, diamond hands)
- Dormancy distribution (how many Punks are "liquid"?)
- Wrapped vs. native tracking
- Wash trade flagging
- Bid depth from Stash data

**MCP tools** (agent-facing):
- `get_item_history` — complete provenance chain for any item
- `get_item_state` — current status (owner, price, listed?, wrapped?)
- `get_owner_profile` — wallet analysis (holdings, behavior, classification)
- `get_market_state` — floor, volume, bid depth, holder count
- `get_dormancy` — supply-side liquidity analysis
- `get_market_depth` — bid/ask distribution
- `search_by_attributes` — trait-based discovery
- `get_bid_activity` — demand-side intelligence

All tool names are generic. When we add Art Blocks, the same tools work — just pass a different collection ID.

## How We Talk About This

**To investors/partners:**
"We're building the data infrastructure layer for digital culture markets — designed for AI agents, not dashboards. Think of us as the Bloomberg terminal for collectibles, but the terminal is an AI."

**To developers:**
"Connect your AI agent to our MCP server. It can immediately query real-time and historical market data for digital collectibles. Start with CryptoPunks, more collections coming."

**To the CryptoPunks community:**
"The best data services shut down. We're building a better one — open, complete, and AI-native. Every transaction since 2017, every bid, every ownership change. Your AI assistant can answer any question about any Punk."

## Success Metrics

Phase 1 (CryptoPunks, 3 months):
- 100+ unique API/MCP users
- Complete historical data (10 years, zero gaps)
- At least 1 third-party integration
- Community recognizes us as "the" CryptoPunks data source

Phase 2 (expand, 6 months):
- 3+ collections indexed
- Data licensing interest from at least 1 institution
- Agent-to-agent data queries (our MCP used by other agents)
